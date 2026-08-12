// PROPOSAL — target path: lib/ai/providers/gemini.provider.ts (replaces existing file)
// Only generateResponse changed: tools passed through when present,
// functionCalls extracted when the model returns them.
// Verify field names (response.functionCalls, fc.args) against your
// installed @google/genai version before merging — SDKs shift these.

import { GoogleGenAI } from "@google/genai";

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

const DEFAULT_MODEL = "gemini-flash-latest";
const PRICE_PER_MILLION_INPUT = 0.3;
const PRICE_PER_MILLION_OUTPUT = 2.5;

function toGeminiContents(history: ChatMessage[], userMessage: string) {
  const turns = history
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: m.content }],
    }));
  turns.push({ role: "user", parts: [{ text: userMessage }] });
  return turns;
}

export class GeminiProvider implements AIProvider {
  readonly name = "GEMINI";
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model || DEFAULT_MODEL;
  }

  async generateResponse(input: GenerateResponseInput): Promise<GenerateResponseResult> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: toGeminiContents(input.history, input.userMessage),
      config: {
        systemInstruction: input.systemPrompt,
        temperature: input.temperature ?? 0.6,
        maxOutputTokens: input.maxOutputTokens ?? 800,
        ...(input.tools?.length
          ? {
              tools: [
                {
                  functionDeclarations: input.tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters as any,
                  })),
                },
              ],
            }
          : {}),
      },
    });

    const toolCalls: ToolCall[] | undefined = response.functionCalls?.length
      ? response.functionCalls.map((fc) => ({
          name: fc.name ?? "",
          arguments: (fc.args as Record<string, unknown>) ?? {},
        }))
      : undefined;

    const content = response.text?.trim() ?? "";
    if (!content && !toolCalls?.length) {
      throw new Error("Gemini رجّع رد فاضي");
    }

    return {
      content,
      toolCalls,
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
    };
  }

  async generateEmbedding(text: string): Promise<EmbedTextResult> {
    return getEmbeddingProvider().embed(text, "RETRIEVAL_QUERY");
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.client.models.generateContent({
        model: this.model,
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        config: { maxOutputTokens: 5 },
      });
      return { ok: true, latencyMs: Date.now() - start, message: null };
    } catch (error) {
      return {
        ok: false,
        latencyMs: null,
        message: error instanceof Error ? error.message : "تعذر الاتصال بـ Gemini",
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
