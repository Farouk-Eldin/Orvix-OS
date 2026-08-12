import { prisma } from "@/lib/prisma";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { conversationRepository } from "@/lib/repositories/conversation.repository";
import { subscriptionRepository } from "@/lib/repositories/subscription.repository";
import { creditsService } from "@/features/billing/services/credits.service";
import { generateAiReply } from "@/lib/ai/rag-service";
import { sendChannelMessage } from "@/lib/channels/send-message";
import { eventBus } from "@/lib/events/event-bus";

// PROPOSAL — target path: features/channels/services/message-handler.service.ts (replaces existing file)
// FINAL consolidated version for this session — booking fields +
// CustomerCreated event + credits fallback + (this pass) passing
// conversationId to generateAiReply for A/B testing's sticky assignment.

const CREDIT_COST_PER_AI_MESSAGE = 1;

interface IncomingMessage {
  workspaceId: string;
  channel: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM";
  /** phone for WhatsApp, PSID for Messenger, IGSID for Instagram */
  externalCustomerId: string;
  customerName?: string;
  text: string;
}

async function findOrCreateCustomer(input: IncomingMessage) {
  const lookup =
    input.channel === "WHATSAPP"
      ? customerRepository.findByPhone(input.workspaceId, input.externalCustomerId)
      : input.channel === "FACEBOOK"
        ? customerRepository.findByFacebookId(input.workspaceId, input.externalCustomerId)
        : customerRepository.findByInstagramId(input.workspaceId, input.externalCustomerId);

  const existing = await lookup;
  if (existing) return existing;

  const created = await customerRepository.create({
    workspace: { connect: { id: input.workspaceId } },
    name: input.customerName ?? null,
    phone: input.channel === "WHATSAPP" ? input.externalCustomerId : null,
    facebookId: input.channel === "FACEBOOK" ? input.externalCustomerId : null,
    instagramId: input.channel === "INSTAGRAM" ? input.externalCustomerId : null,
  });

  eventBus.emitEvent("CustomerCreated", { workspaceId: input.workspaceId, customerId: created.id });
  return created;
}

async function sendReply(input: IncomingMessage, replyText: string) {
  return sendChannelMessage(
    { workspaceId: input.workspaceId, channel: input.channel, externalCustomerId: input.externalCustomerId },
    replyText
  );
}

/**
 * The single entry point every channel webhook calls once it has parsed a
 * customer message out of Meta's payload shape. Everything channel-agnostic
 * (limits, credits, RAG, saving, sending the reply) lives here exactly once.
 */
export async function handleIncomingMessage(input: IncomingMessage) {
  const workspaceRecord = await prisma.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { suspended: true },
  });
  if (workspaceRecord?.suspended) {
    console.log(`[channels] workspace ${input.workspaceId} is suspended — message stored, no reply`);
  }

  const customer = await findOrCreateCustomer(input);

  let conversation = await conversationRepository.findActiveForCustomer(customer.id);
  if (!conversation) {
    conversation = await conversationRepository.create({
      workspace: { connect: { id: input.workspaceId } },
      customer: { connect: { id: customer.id } },
      channel: input.channel,
      status: "ACTIVE",
      lastMessageAt: new Date(),
    });
  }

  await conversationRepository.addMessage({
    conversation: { connect: { id: conversation.id } },
    sender: "CUSTOMER",
    messageType: "TEXT",
    content: input.text,
    aiGenerated: false,
  });
  await conversationRepository.touch(conversation.id);

  eventBus.emitEvent("MessageReceived", {
    workspaceId: input.workspaceId,
    conversationId: conversation.id,
    channel: input.channel,
  });

  if (workspaceRecord?.suspended) {
    return { replied: false as const, reason: "SUSPENDED" as const };
  }

  // Subscription/trial allowance first; if that's exhausted, spend one
  // credit as a fallback rather than refusing outright. Credits are
  // opt-in by having a balance at all — most workspaces have zero and
  // this check is then a cheap no-op query.
  let paidByCredit = false;
  let canReply = await subscriptionRepository.hasRemainingMessages(input.workspaceId);
  if (!canReply) {
    try {
      await creditsService.spend(input.workspaceId, CREDIT_COST_PER_AI_MESSAGE, "AI_MESSAGE_SPEND", `conversation:${conversation.id}`);
      canReply = true;
      paidByCredit = true;
    } catch {
      // INSUFFICIENT_CREDITS or zero balance — falls through to the
      // existing "stored without a reply" behavior below, unchanged.
    }
  }

  if (!canReply) {
    console.log(`[channels] workspace ${input.workspaceId} hit its message limit — stored without a reply`);
    return { replied: false as const, reason: "LIMIT_REACHED" as const };
  }

  const priorMessages = await conversationRepository.history(conversation.id, 10);
  const history = priorMessages
    .slice(1) // drop the message we just saved above
    .reverse()
    .map((m) => ({ sender: m.sender, content: m.content }));

  const aiResult = await generateAiReply({
    workspaceId: input.workspaceId,
    customerId: customer.id,
    conversationId: conversation.id,
    channel: input.channel,
    customerMessage: input.text,
    conversationHistory: history,
  });

  await conversationRepository.addMessage({
    conversation: { connect: { id: conversation.id } },
    sender: "AI",
    messageType: "TEXT",
    content: aiResult.reply,
    aiGenerated: true,
    confidenceScore: aiResult.confidence,
    responseTimeMs: aiResult.responseTimeMs,
  });
  await conversationRepository.touch(conversation.id);

  // A credit-funded reply must NOT also decrement the subscription
  // counter — that would double-charge the workspace for one message.
  if (!paidByCredit) {
    await subscriptionRepository.incrementMessagesUsed(input.workspaceId);
  }

  eventBus.emitEvent("AiReplySent", {
    workspaceId: input.workspaceId,
    conversationId: conversation.id,
    customerId: customer.id,
    confidence: aiResult.confidence,
  });

  const sendResult = await sendReply(input, aiResult.reply);
  if (!sendResult.success) {
    console.error(`[channels] failed to deliver reply on ${input.channel}:`, sendResult.error);
  }

  return { replied: sendResult.success, reason: "OK" as const, confidence: aiResult.confidence, paidByCredit };
}
