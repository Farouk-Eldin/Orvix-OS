export interface RetrievedChunk {
  chunkId: string;
  fileName: string;
  content: string;
  score: number;
}

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";
