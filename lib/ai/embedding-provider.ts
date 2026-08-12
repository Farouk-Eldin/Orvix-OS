import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_DIMENSIONS = 768;

export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  tokenCount: number | null;
}

export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export interface EmbeddingProvider {
  readonly name: "GEMINI";
  embed(text: string, taskType: EmbeddingTaskType): Promise<EmbeddingResult>;
  health(): Promise<boolean>;
}

class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly name = "GEMINI" as const;
  private client: GoogleGenAI;
  private model = "gemini-embedding-001";

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async embed(text: string, taskType: EmbeddingTaskType): Promise<EmbeddingResult> {
    const response = await this.client.models.embedContent({
      model: this.model,
      contents: text,
      config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
    });

    const embedding = response.embeddings?.[0];
    if (!embedding?.values) {
      throw new Error("Gemini embedContent returned no vector");
    }

    return {
      vector: embedding.values,
      dimensions: embedding.values.length,
      tokenCount: embedding.statistics?.tokenCount ?? null,
    };
  }

  async health(): Promise<boolean> {
    try {
      await this.embed("health check", "RETRIEVAL_QUERY");
      return true;
    } catch {
      return false;
    }
  }
}

/** Throws clearly if the workspace/platform hasn't configured a key yet — callers surface this as a friendly Arabic error, never a silent fake vector. */
export function getEmbeddingProvider(): EmbeddingProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY غير موجود — لازم تضيفه في .env عشان تشتغل المعالجة");
  }
  return new GeminiEmbeddingProvider(apiKey);
}
