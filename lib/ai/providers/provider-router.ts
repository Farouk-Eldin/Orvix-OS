import { prisma } from "@/lib/prisma";
import { decryptAiProviderKey } from "@/lib/encryption";
import { GeminiProvider } from "@/lib/ai/providers/gemini.provider";
import { GrokProvider } from "@/lib/ai/providers/grok.provider";
import type { AIProvider } from "@/lib/ai/providers/types";

/**
 * Never hardcode provider logic elsewhere in the app — this is the only
 * place that knows GEMINI maps to GeminiProvider and GROK maps to
 * GrokProvider. Adding OpenAI/Claude/DeepSeek later means adding one
 * `case` here and a new provider class; nothing else changes.
 */
function instantiate(
  provider: "GEMINI" | "GROK" | "OPENAI" | "CLAUDE" | "DEEPSEEK",
  apiKey: string,
  model: string
): AIProvider {
  switch (provider) {
    case "GEMINI":
      return new GeminiProvider(apiKey, model);
    case "GROK":
      return new GrokProvider(apiKey, model);
    default:
      throw new Error(`مزود "${provider}" لسه مش متاح — يشتغل من غير تغيير في باقي الكود لما يتضاف`);
  }
}

export class ProviderRouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderRouterError";
  }
}

/**
 * Returns configured providers for a workspace, ordered oldest-first
 * (the first one a workspace connects acts as primary; any later one is
 * the failover target per the spec's failover system).
 */
async function getWorkspaceProviders(workspaceId: string) {
  const rows = await prisma.aIProvider.findMany({
    where: { workspaceId, enabled: true },
    orderBy: { createdAt: "asc" },
  });

  if (rows.length === 0) {
    throw new ProviderRouterError(
      "مفيش مزود ذكاء اصطناعي متصل بالنشاط ده. ضيف مفتاح Gemini أو Grok من الإعدادات الأول."
    );
  }

  return rows.map((row) => ({
    row,
    instance: instantiate(row.provider, decryptAiProviderKey(row.apiKeyEncrypted), row.defaultModel),
  }));
}

export const providerRouter = {
  getWorkspaceProviders,

  /**
   * Runs `fn` against the workspace's primary provider; on failure, tries
   * the next enabled provider (if any) before giving up. Every attempt is
   * logged so failures are visible without silently swallowing them.
   */
  async withFailover<T>(
    workspaceId: string,
    fn: (provider: AIProvider) => Promise<T>
  ): Promise<{ result: T; usedProvider: string }> {
    const providers = await getWorkspaceProviders(workspaceId);
    let lastError: unknown;

    for (const { instance } of providers) {
      try {
        const result = await fn(instance);
        return { result, usedProvider: instance.name };
      } catch (error) {
        lastError = error;
        console.error(`[provider-router] ${instance.name} failed for workspace ${workspaceId}:`, error);
      }
    }

    throw new ProviderRouterError(
      lastError instanceof Error ? lastError.message : "كل مزودي الذكاء الاصطناعي فشلوا في الرد"
    );
  },
};
