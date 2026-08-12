// PROPOSAL — target path: lib/ai/providers/grok.provider.ts (replaces existing file)
// Only generateResponse changed: tools passed through in OpenAI's
// function-calling shape, tool_calls extracted and JSON-parsed when
// the model returns them. This is the standard OpenAI SDK convention,
// stable across versions.

import OpenAI from "openai";

import type {
  AIProvider,
  ChatMessage,
  EmbedTextResult,
  GenerateResponseInput,
  GenerateResponseResult,
  HealthCheckResult,
  ToolCall,
} from "@/lib/ai/providers/types";
import { getEmbeddingProvider } from "@/lib/ai/embedding-provider";

const DEFAULT_MODEL = "grok-4.5";
const PRICE_PER_MILLION_INPUT = 1.25;
const PRICE_PER_MILLION_OUTPUT = 2.5;

function toOpenAiMessages(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    { role: "system", content: systemPrompt },
    ...history
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }) as OpenAI.Chat.ChatCompletionMessageParam),
    { role: "user", content: userMessage },
  ];
}

function safeJsonParse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export class GrokProvider implements AIProvider {
  readonly name = "GROK";
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
    this.model = model || DEFAULT_MODEL;
  }

  async generateResponse(input: GenerateResponseInput): Promise<GenerateResponseResult> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: toOpenAiMessages(input.systemPrompt, input.history, input.userMessage),
      temperature: input.temperature ?? 0.6,
      max_tokens: input.maxOutputTokens ?? 800,
      ...(input.tools?.length
        ? {
            tools: input.tools.map((t) => ({
              type: "function" as const,
              function: { name: t.name, description: t.description, parameters: t.parameters as any },
            })),
          }
        : {}),
    });

    const message = completion.choices[0]?.message;
    const rawToolCalls = message?.tool_calls;

    const toolCalls: ToolCall[] | undefined = rawToolCalls?.length
      ? rawToolCalls
          .filter((tc): tc is typeof tc & { type: "function" } => tc.type === "function")
          .map((tc) => ({
            name: tc.function.name,
            arguments: safeJsonParse(tc.function.arguments),
          }))
      : undefined;

    const content = message?.content?.trim() ?? "";
    if (!content && !toolCalls?.length) {
      throw new Error("Grok رجّع رد فاضي");
    }

    return {
      content,
      toolCalls,
      inputTokens: completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
      totalTokens: completion.usage?.total_tokens ?? 0,
    };
  }

  async generateEmbedding(text: string): Promise<EmbedTextResult> {
    return getEmbeddingProvider().embed(text, "RETRIEVAL_QUERY");
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 5,
      });
      return { ok: true, latencyMs: Date.now() - start, message: null };
    } catch (error) {
      return {
        ok: false,
        latencyMs: null,
        message: error instanceof Error ? error.message : "تعذر الاتصال بـ Grok",
      };
    }
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return (
      (inputTokens / 1_000_000) * PRICE_PER_MILLION_INPUT +
      (outputTokens / 1_000_000) * PRICE_PER_MILLION_OUTPUT
    );
  }
}
