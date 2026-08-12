import { prisma } from "@/lib/prisma";
import { qdrant, collectionNameFor } from "@/lib/qdrant";
import { getEmbeddingProvider } from "@/lib/ai/embedding-provider";
import { providerRouter } from "@/lib/ai/providers/provider-router";
import { buildSystemPrompt, buildFallbackReply, toChatHistory } from "@/lib/ai/prompt-builder";
import { BOOKING_TOOLS } from "@/lib/ai/tools/booking-tools";
import { executeToolCall } from "@/lib/ai/tools/tool-router";
import { featureRepository } from "@/lib/repositories/feature.repository";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { promptExperimentService } from "@/features/ai/services/prompt-experiment.service";
import type { PromptSnapshot } from "@/features/ai/services/prompt-version.service";
import type { RetrievedChunk, ConfidenceLevel } from "@/lib/ai/types";
import type { AIEmployee } from "@prisma/client";

// PROPOSAL — target path: lib/ai/rag-service.ts (replaces existing file)
// FINAL consolidated version. customerId, conversationId, and channel
// are all OPTIONAL — real for the channel webhook path
// (message-handler.service.ts passes all three), absent for contexts
// with no real conversation behind them (the AI Test Playground,
// app/api/v1/ai/test/route.ts) where booking tool-calling and A/B
// assignment are correctly skipped rather than acting on fabricated IDs.

export type { RetrievedChunk, ConfidenceLevel } from "@/lib/ai/types";

const LOW_CONFIDENCE_THRESHOLD = 0.55;
const HIGH_CONFIDENCE_THRESHOLD = 0.75;
const TOP_K = 5;

function scoreToConfidence(chunks: RetrievedChunk[]): ConfidenceLevel {
  if (chunks.length === 0) return "LOW";
  const topScore = chunks[0]?.score ?? 0;
  if (topScore >= HIGH_CONFIDENCE_THRESHOLD) return "HIGH";
  if (topScore >= LOW_CONFIDENCE_THRESHOLD) return "MEDIUM";
  return "LOW";
}

async function retrieveRelevantChunks(workspaceId: string, queryVector: number[]): Promise<RetrievedChunk[]> {
  const collection = collectionNameFor(workspaceId);
  const { exists } = await qdrant.collectionExists(collection);
  if (!exists) return [];

  const response = (await qdrant.query(collection, {
    query: queryVector,
    limit: TOP_K,
    with_payload: true,
  })) as unknown as {
    points: { id: string | number; score: number; payload?: Record<string, unknown> | null }[];
  };

  return response.points.map((r) => ({
    chunkId: String(r.payload?.chunkId ?? r.id),
    fileName: String(r.payload?.fileName ?? "ملف"),
    content: String(r.payload?.content ?? ""),
    score: r.score,
  }));
}

// If a RUNNING experiment exists for this employee AND a conversationId
// is available, resolve which variant this conversation is stuck to and
// return an "effective employee" with that variant's fields merged over
// the live record. Without a conversationId (e.g. the AI Test
// Playground — no real conversation exists there), there's nothing to
// stick a variant assignment to, so this is skipped entirely and the
// live employee config is used as-is — not an error, just not
// applicable outside a real conversation.
async function resolveEffectiveEmployee(
  employee: AIEmployee,
  conversationId?: string
): Promise<{ effective: AIEmployee; experimentId: string | null }> {
  if (!conversationId) return { effective: employee, experimentId: null };

  const experiment = await promptExperimentService.getActiveExperiment(employee.id);
  if (!experiment) return { effective: employee, experimentId: null };

  const assignment = await promptExperimentService.assignVariant(
    experiment.id,
    conversationId,
    experiment.trafficSplitPercent
  );

  const snapshot = (
    assignment.variant === "A" ? experiment.variantASnapshot : experiment.variantBSnapshot
  ) as unknown as PromptSnapshot;

  return { effective: { ...employee, ...snapshot } as AIEmployee, experimentId: experiment.id };
}

async function tryHandleBookingIntent(params: {
  workspaceId: string;
  customerId: string;
  channel: string;
  employeeLanguage: string;
  businessName: string;
  history: { sender: "CUSTOMER" | "AI"; content: string }[];
  customerMessage: string;
}): Promise<{ reply: string; usedProvider: string | null } | null> {
  const intentSystemPrompt = [
    `انت مساعد حجوزات لنشاط اسمه ${params.businessName}.`,
    "لو رسالة العميل طلب حجز، إلغاء، أو استعلام عن ميعاد، استخدم الأداة المناسبة.",
    "لو مش طلب متعلق بالحجز، متستخدمش أي أداة خالص.",
  ].join(" ");

  const { result, usedProvider } = await providerRouter.withFailover(params.workspaceId, (provider) =>
    provider.generateResponse({
      systemPrompt: intentSystemPrompt,
      history: toChatHistory(params.history),
      userMessage: params.customerMessage,
      maxOutputTokens: 200,
      tools: BOOKING_TOOLS,
    })
  );

  const toolCall = result.toolCalls?.[0];
  if (!toolCall) return null;

  const outcome = await executeToolCall(toolCall, {
    workspaceId: params.workspaceId,
    customerId: params.customerId,
    channel: params.channel,
  });

  return { reply: describeOutcome(outcome, params.employeeLanguage), usedProvider };
}

function describeOutcome(outcome: Awaited<ReturnType<typeof executeToolCall>>, language: string): string {
  const ar = language !== "en";

  if (!outcome.ok) return outcome.message;

  if ("booked" in outcome.result) {
    const when = outcome.result.startAt.toLocaleString(ar ? "ar-EG" : "en-US");
    return ar ? `تم الحجز! معادك يوم ${when}.` : `You're booked for ${when}.`;
  }

  // Structurally part of the union (shared with the separate CRM
  // enrichment pass in customer-memory.service.ts) but this function only
  // ever runs for check_availability/create_booking outcomes — excluded
  // explicitly so the type narrows, not because it happens in practice.
  if ("noted" in outcome.result || "taskCreated" in outcome.result) {
    return ar ? "تم." : "Done.";
  }

  if (outcome.result.available) {
    return ar ? "الميعاد ده متاح، تحب أأكده؟" : "That time is available — want me to confirm it?";
  }

  const nearest = outcome.result.nearestSlot?.toLocaleString(ar ? "ar-EG" : "en-US");
  return nearest
    ? ar
      ? `للأسف الميعاد ده مش متاح، أقرب وقت فاضي ${nearest}. حجزلك؟`
      : `That time isn't available. The nearest open slot is ${nearest} — book that instead?`
    : ar
      ? "للأسف مفيش مواعيد فاضية قريب، ممكن تجرب أسبوع تاني؟"
      : "No open slots nearby — could you try another week?";
}

export interface GenerateReplyResult {
  reply: string;
  confidence: ConfidenceLevel;
  retrievedChunks: RetrievedChunk[];
  usedProvider: string | null;
  inputTokens: number;
  outputTokens: number;
  responseTimeMs: number;
  promptTimeMs: number;
}

export async function generateAiReply(params: {
  workspaceId: string;
  customerId?: string; // optional — booking tool-calling is skipped without it (no real customer to act on)
  conversationId?: string; // optional — A/B testing assignment is skipped without it (nothing to stick a variant to)
  channel?: string; // optional — only meaningful alongside customerId, for a booking actually created
  customerMessage: string;
  conversationHistory: { sender: "CUSTOMER" | "AI"; content: string }[];
}): Promise<GenerateReplyResult> {
  const start = Date.now();

  const [defaultEmployee, workspace] = await Promise.all([
    prisma.aIEmployee.findFirst({ where: { workspaceId: params.workspaceId, isDefault: true } }),
    prisma.workspace.findUnique({ where: { id: params.workspaceId } }),
  ]);

  if (!defaultEmployee) {
    throw new Error("مفيش موظف ذكاء اصطناعي معرّف لهذا النشاط — كمّل خطوة الإعداد الأول");
  }
  if (!workspace) {
    throw new Error("النشاط غير موجود");
  }

  // Admin-side pause, separate from a subscription/trial limit — lets
  // support disable AI replies for one workspace (abuse, a runaway cost
  // spike, a customer complaint) without suspending the whole account.
  if (!(await featureRepository.isEnabled(params.workspaceId, "ai_replies"))) {
    return {
      reply: "المساعد الذكي متوقف مؤقتًا لهذا الحساب. تواصل مع الدعم الفني لمعرفة التفاصيل.",
      confidence: "LOW",
      retrievedChunks: [],
      usedProvider: null,
      inputTokens: 0,
      outputTokens: 0,
      responseTimeMs: Date.now() - start,
      promptTimeMs: 0,
    };
  }

  const { effective: employee } = await resolveEffectiveEmployee(defaultEmployee, params.conversationId);

  // Booking intent needs a real customer and channel to act on — both
  // absent in contexts like the AI Test Playground, which has no real
  // conversation behind it. Skipping here, not erroring: a test message
  // should never be able to create a real booking record.
  if (employee.canManageBookings && params.customerId && params.channel) {
    const bookingOutcome = await tryHandleBookingIntent({
      workspaceId: params.workspaceId,
      customerId: params.customerId,
      channel: params.channel,
      employeeLanguage: employee.language,
      businessName: workspace.name,
      history: params.conversationHistory,
      customerMessage: params.customerMessage,
    });

    if (bookingOutcome) {
      return {
        reply: bookingOutcome.reply,
        confidence: "HIGH",
        retrievedChunks: [],
        usedProvider: bookingOutcome.usedProvider,
        inputTokens: 0,
        outputTokens: 0,
        responseTimeMs: Date.now() - start,
        promptTimeMs: 0,
      };
    }
  }

  // ---- everything below this line is unchanged from before A/B testing ----

  const promptStart = Date.now();
  const queryEmbedding = await getEmbeddingProvider().embed(params.customerMessage, "RETRIEVAL_QUERY");

  const retrievedChunks = await retrieveRelevantChunks(params.workspaceId, queryEmbedding.vector);
  const confidence = scoreToConfidence(retrievedChunks);
  const promptTimeMs = Date.now() - promptStart;

  if (confidence === "LOW") {
    return {
      reply: buildFallbackReply(employee),
      confidence,
      retrievedChunks,
      usedProvider: null,
      inputTokens: 0,
      outputTokens: 0,
      responseTimeMs: Date.now() - start,
      promptTimeMs,
    };
  }

  let customerSummary: string | null = null;
  if (params.customerId) {
    const customer = await customerRepository.findByIdInWorkspace(params.customerId, params.workspaceId);
    customerSummary = customer?.aiSummary ?? null;
  }

  const systemPrompt = buildSystemPrompt({ employee, retrievedChunks, businessName: workspace.name, customerSummary });

  const { result, usedProvider } = await providerRouter.withFailover(params.workspaceId, (provider) =>
    provider.generateResponse({
      systemPrompt,
      history: toChatHistory(params.conversationHistory),
      userMessage: params.customerMessage,
      maxOutputTokens: employee.replyLength === "SHORT" ? 200 : 800,
    })
  );

  return {
    reply: result.content,
    confidence,
    retrievedChunks,
    usedProvider,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    responseTimeMs: Date.now() - start,
    promptTimeMs,
  };
}
