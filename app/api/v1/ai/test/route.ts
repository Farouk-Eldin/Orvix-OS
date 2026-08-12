import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { generateAiReply } from "@/lib/ai/rag-service";
import { ProviderRouterError } from "@/lib/ai/providers/provider-router";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const testSchema = z.object({
  message: z.string().min(1, "اكتب سؤال الأول").max(2000),
  history: z
    .array(z.object({ sender: z.enum(["CUSTOMER", "AI"]), content: z.string() }))
    .max(20)
    .default([]),
});

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`ai-test:${workspace.id}`, RATE_LIMITS.aiRequest);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = testSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const result = await generateAiReply({
      workspaceId: workspace.id,
      customerMessage: parsed.data.message,
      conversationHistory: parsed.data.history,
    });

    return apiSuccess({
      reply: result.reply,
      confidence: result.confidence,
      usedProvider: result.usedProvider,
      retrievedChunks: result.retrievedChunks.map((c) => ({
        fileName: c.fileName,
        preview: c.content.slice(0, 220),
        score: Math.round(c.score * 1000) / 1000,
      })),
      tokens: { input: result.inputTokens, output: result.outputTokens },
      timing: { promptMs: result.promptTimeMs, totalMs: result.responseTimeMs },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof ProviderRouterError) {
      return apiError(error.message, [], 424);
    }
    console.error("POST /api/ai/test failed:", error);
    return apiErrors.serverError();
  }
}
