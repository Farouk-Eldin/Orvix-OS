// PROPOSAL — target path: lib/ai/providers/types.ts (replaces existing file)
// Adds tool-calling. Both new fields are optional, so every existing
// call site (playground, rag-service before this change) compiles and
// behaves exactly as before.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface GenerateResponseInput {
  systemPrompt: string;
  history: ChatMessage[];
  userMessage: string;
  temperature?: number;
  maxOutputTokens?: number;
  tools?: ToolDefinition[];
}

export interface GenerateResponseResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  toolCalls?: ToolCall[];
}

export interface EmbedTextResult {
  vector: number[];
  dimensions: number;
  tokenCount: number | null;
}

export interface HealthCheckResult {
  ok: boolean;
  latencyMs: number | null;
  message: string | null;
}

/**
 * Every AI provider (Gemini, Grok, and future OpenAI/Claude/DeepSeek
 * providers) implements this exact shape. The Provider Router only ever
 * talks to this interface — swapping or adding a provider never touches
 * application logic elsewhere (Prompt Builder, RAG service, playground).
 */
export interface AIProvider {
  readonly name: string;

  generateResponse(input: GenerateResponseInput): Promise<GenerateResponseResult>;

  /**
   * Not every provider has an embeddings API (Grok doesn't). Providers
   * without one should delegate to the shared Gemini embedding pipeline
   * rather than throw — every workspace's vectors must come from the same
   * model so they stay comparable inside one Qdrant collection.
   */
  generateEmbedding(text: string): Promise<EmbedTextResult>;

  checkHealth(): Promise<HealthCheckResult>;

  /** Rough USD estimate for a call — shown in the AI Test Playground, not billed anywhere yet. */
  estimateCost(inputTokens: number, outputTokens: number): number;
}
