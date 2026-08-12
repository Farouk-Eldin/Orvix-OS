import { QdrantClient } from "@qdrant/js-client-rest";

const globalForQdrant = globalThis as unknown as { qdrant: QdrantClient | undefined };

export const qdrant =
  globalForQdrant.qdrant ??
  new QdrantClient({
    url: process.env.QDRANT_URL ?? "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY,
  });

if (process.env.NODE_ENV !== "production") {
  globalForQdrant.qdrant = qdrant;
}

/** One collection per workspace keeps semantic search naturally isolated per tenant. */
export function collectionNameFor(workspaceId: string) {
  return `workspace_${workspaceId}`;
}

export async function ensureCollection(workspaceId: string, dimensions: number) {
  const name = collectionNameFor(workspaceId);
  const exists = await qdrant.collectionExists(name);
  if (!exists.exists) {
    await qdrant.createCollection(name, {
      vectors: { size: dimensions, distance: "Cosine" },
    });
  }
  return name;
}
