import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { encryptAiProviderKey, decryptAiProviderKey, maskSecret } from "@/lib/encryption";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const saveProviderSchema = z.object({
  provider: z.enum(["GEMINI", "GROK"]),
  apiKey: z.string().min(10, "المفتاح قصير أوي عشان يكون صحيح"),
  defaultModel: z.string().min(1),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const providers = await prisma.aIProvider.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
    });

    // Decrypt momentarily, server-side only, purely to compute a mask the
    // owner can recognise (e.g. "AIza••••••••9kLp") — the plaintext itself
    // never leaves this function, let alone the server.
    const safe = providers.map((p) => {
      let maskedKey = "••••••••";
      try {
        maskedKey = maskSecret(decryptAiProviderKey(p.apiKeyEncrypted));
      } catch (error) {
        console.error(`Failed to decrypt AIProvider ${p.id} for masking:`, error);
      }
      return {
        id: p.id,
        provider: p.provider,
        defaultModel: p.defaultModel,
        enabled: p.enabled,
        maskedKey,
        createdAt: p.createdAt,
      };
    });

    return apiSuccess(safe);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`ai-provider-save:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = saveProviderSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const encrypted = encryptAiProviderKey(parsed.data.apiKey);

    const saved = await prisma.aIProvider.upsert({
      where: { workspaceId_provider: { workspaceId: workspace.id, provider: parsed.data.provider } },
      update: { apiKeyEncrypted: encrypted, defaultModel: parsed.data.defaultModel, enabled: true },
      create: {
        workspaceId: workspace.id,
        provider: parsed.data.provider,
        apiKeyEncrypted: encrypted,
        defaultModel: parsed.data.defaultModel,
        enabled: true,
      },
    });

    return apiSuccess(
      { id: saved.id, provider: saved.provider, maskedKey: maskSecret(parsed.data.apiKey) },
      "تم حفظ المفتاح بأمان (مشفّر)"
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/ai/providers failed:", error);
    return apiErrors.serverError();
  }
}
