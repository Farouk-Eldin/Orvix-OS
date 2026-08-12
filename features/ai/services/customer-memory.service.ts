import { customerRepository } from "@/lib/repositories/customer.repository";
import { conversationRepository } from "@/lib/repositories/conversation.repository";
import { providerRouter } from "@/lib/ai/providers/provider-router";
import { CRM_ENRICHMENT_TOOLS } from "@/lib/ai/tools/crm-tools";
import { TASK_TOOLS } from "@/lib/ai/tools/task-tools";
import { executeToolCall } from "@/lib/ai/tools/tool-router";

// Enough to catch a fresh conversation without re-summarizing on every
// single incoming message — a busy customer thread would otherwise spend
// a provider call per reply just to say roughly the same thing again.
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

export const customerMemoryService = {
  async refreshIfStale(customerId: string, workspaceId: string) {
    const customer = await customerRepository.findByIdInWorkspace(customerId, workspaceId);
    if (!customer) return;

    const isStale =
      !customer.aiSummaryUpdatedAt || Date.now() - customer.aiSummaryUpdatedAt.getTime() > REFRESH_INTERVAL_MS;
    if (!isStale) return;

    const { conversations, bookings, notes } = await customerRepository.getTimeline(customerId);

    // Nothing to summarize yet for a brand-new customer — don't spend a
    // provider call just to write "no history".
    if (conversations.length === 0 && bookings.length === 0 && notes.length === 0) return;

    const latestBookingServiceName = bookings[0]?.service?.name;

    const facts = [
      `اسم العميل: ${customer.name ?? "غير معروف"}`,
      `اللغة المفضّلة: ${customer.language}`,
      `عدد المحادثات السابقة: ${conversations.length}`,
      `عدد الحجوزات: ${bookings.length}`,
      latestBookingServiceName ? `آخر خدمة اتحجزت: ${latestBookingServiceName}` : "",
      notes.length > 0 ? `ملاحظات سابقة: ${notes.slice(0, 5).map((n) => n.content).join(" | ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const { result } = await providerRouter.withFailover(workspaceId, (provider) =>
        provider.generateResponse({
          systemPrompt:
            "أنت نظام داخلي بيلخّص بيانات عميل في 2-3 جمل قصيرة بالعربي، عشان موظف ذكاء اصطناعي تاني يستخدمها كسياق قبل ما يرد. ركّز بس على: هل ده عميل عائد؟ بيسأل غالبًا عن إيه؟ أي تفضيل واضح؟ من غير أي مقدمة، رجّع الملخص مباشرة.",
          history: [],
          userMessage: facts,
          temperature: 0.3,
          maxOutputTokens: 200,
        })
      );

      await customerRepository.update(customerId, {
        aiSummary: result.content.trim(),
        aiSummaryUpdatedAt: new Date(),
      });
    } catch (error) {
      // Runs after the reply that triggered it was already sent — a
      // failed refresh here must never surface as a broken reply.
      console.error(`[customer-memory] failed to refresh summary for ${customerId}:`, error);
    }

    const latestConversation = conversations[0];
    if (latestConversation) {
      await this.runEnrichmentPass(workspaceId, customerId, latestConversation.id);
    }
  },

  /**
   * A second, focused call — separate from the summary above on purpose,
   * same reasoning as tryHandleBookingIntent in rag-service.ts: a model
   * given tools "just in case" tends to reach for them more than one
   * given a narrow, single-purpose prompt. Runs async, after the reply,
   * so it never adds latency or cost to the live conversation.
   */
  async runEnrichmentPass(workspaceId: string, customerId: string, conversationId: string) {
    const recentMessages = await conversationRepository.history(conversationId, 6);
    if (recentMessages.length === 0) return;

    const transcript = recentMessages
      .slice()
      .reverse()
      .map((m) => `${m.sender === "CUSTOMER" ? "العميل" : "المساعد"}: ${m.content}`)
      .join("\n");

    try {
      const { result } = await providerRouter.withFailover(workspaceId, (provider) =>
        provider.generateResponse({
          systemPrompt:
            "راجع آخر جزء من محادثة عميل. لو فيه حاجة فعلاً تستاهل تتسجّل كملاحظة لفريق العمل (اهتمام واضح، شكوى، تفضيل مهم) استخدم add_customer_note. لو المحادثة محتاجة متابعة بشرية حقيقية (اتصال، مراجعة سعر) استخدم create_task. لو مفيش حاجة جديدة تستاهل، متستخدمش أي أداة خالص — الافتراضي إنك متعملش حاجة.",
          history: [],
          userMessage: transcript,
          temperature: 0.2,
          maxOutputTokens: 150,
          tools: [...CRM_ENRICHMENT_TOOLS, ...TASK_TOOLS],
        })
      );

      const toolCall = result.toolCalls?.[0];
      if (!toolCall) return;

      // At most one enrichment action per pass — this is a light touch,
      // not a second AI employee running the conversation.
      await executeToolCall(toolCall, { workspaceId, customerId, channel: "internal" });
    } catch (error) {
      console.error(`[customer-memory] enrichment pass failed for ${customerId}:`, error);
    }
  },
};
