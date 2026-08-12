import { randomUUID } from "crypto";

import { prisma } from "@/lib/prisma";
import { qdrant, ensureCollection, collectionNameFor } from "@/lib/qdrant";
import { supabase } from "@/lib/supabase";
import { getEmbeddingProvider, EMBEDDING_DIMENSIONS } from "@/lib/ai/embedding-provider";
import { extractText, cleanText } from "@/lib/knowledge/text-extractor";
import { chunkText } from "@/lib/knowledge/text-chunker";
import { knowledgeRepository } from "@/lib/repositories/knowledge.repository";
import { eventBus } from "@/lib/events/event-bus";

async function markStep(
  workspaceId: string,
  fileId: string,
  step: "EXTRACT" | "CLEAN" | "CHUNK" | "EMBED" | "STORE",
  status: "RUNNING" | "COMPLETED" | "FAILED"
) {
  await prisma.fileProcessingQueue
    .create({
      data: {
        workspaceId,
        fileId,
        step,
        status,
        startedAt: status === "RUNNING" ? new Date() : undefined,
        finishedAt: status !== "RUNNING" ? new Date() : undefined,
      },
    })
    .catch((error) => console.error("[file-processing] queue log failed:", error));
}

/**
 * Runs the whole pipeline inline (no separate worker process required to
 * see it work). For real production scale, hand this same function to a
 * BullMQ worker (see scripts/worker.ts) instead of calling it from the
 * request handler — nothing else here needs to change.
 */
export async function processKnowledgeFile(params: {
  workspaceId: string;
  fileId: string;
  storagePath: string;
  fileType: "PDF" | "TXT" | "MANUAL";
  fileName: string;
}): Promise<{ success: boolean; chunksCreated: number; error?: string }> {
  const { workspaceId, fileId, storagePath, fileType, fileName } = params;

  try {
    await knowledgeRepository.setFileStatus(fileId, "PROCESSING");

    // Idempotency: a retry after a partial failure (or a manual
    // reprocess) must not pile up duplicate chunks/vectors on top of
    // whatever already made it through last time.
    const existingChunks = await prisma.knowledgeChunk.findMany({
      where: { fileId },
      include: { embedding: true },
    });
    const existingPointIds = existingChunks
      .map((c) => c.embedding?.qdrantPointId)
      .filter((id): id is string => Boolean(id));
    if (existingPointIds.length > 0) {
      await qdrant
        .delete(collectionNameFor(workspaceId), { points: existingPointIds })
        .catch((e) => console.error("[file-processing] stale Qdrant cleanup failed:", e));
    }
    if (existingChunks.length > 0) {
      await prisma.knowledgeChunk.deleteMany({ where: { fileId } });
    }

    // 1) EXTRACT
    await markStep(workspaceId, fileId, "EXTRACT", "RUNNING");
    let buffer: Buffer;
    if (!supabase) throw new Error("Supabase Storage غير متصل");
    const { data, error } = await supabase.storage.from("knowledge-base").download(storagePath);
    if (error) throw new Error(error.message);
    buffer = Buffer.from(await data.arrayBuffer());
    const rawText = await extractText(buffer, fileType);
    await markStep(workspaceId, fileId, "EXTRACT", "COMPLETED");

    // 2) CLEAN
    await markStep(workspaceId, fileId, "CLEAN", "RUNNING");
    const cleaned = cleanText(rawText);
    if (cleaned.length < 10) {
      throw new Error("الملف فاضي أو مفيش نص ممكن يتقرأ منه");
    }
    await markStep(workspaceId, fileId, "CLEAN", "COMPLETED");

    // 3) CHUNK
    await markStep(workspaceId, fileId, "CHUNK", "RUNNING");
    const chunks = chunkText(cleaned);
    if (chunks.length === 0) {
      throw new Error("متقدرش نقسّم الملف لأجزاء قابلة للفهرسة");
    }
    await markStep(workspaceId, fileId, "CHUNK", "COMPLETED");

    // 4) EMBED + 5) STORE — one chunk at a time so a single failure doesn't
    // lose everything already embedded; Qdrant + Postgres stay in lockstep.
    await markStep(workspaceId, fileId, "EMBED", "RUNNING");
    const embeddingProvider = getEmbeddingProvider();
    await ensureCollection(workspaceId, EMBEDDING_DIMENSIONS);

    let created = 0;
    for (const chunk of chunks) {
      const embedding = await embeddingProvider.embed(chunk.content, "RETRIEVAL_DOCUMENT");

      const chunkRow = await prisma.knowledgeChunk.create({
        data: {
          fileId,
          chunkIndex: chunk.index,
          content: chunk.content,
          tokenCount: chunk.approxTokenCount,
        },
      });

      const qdrantPointId = randomUUID();
      await qdrant.upsert(collectionNameFor(workspaceId), {
        points: [
          {
            id: qdrantPointId,
            vector: embedding.vector,
            payload: { chunkId: chunkRow.id, fileId, fileName, content: chunk.content },
          },
        ],
      });

      await prisma.embedding.create({
        data: {
          chunkId: chunkRow.id,
          provider: "GEMINI",
          qdrantPointId,
          dimensions: embedding.dimensions,
        },
      });

      created += 1;
    }
    await markStep(workspaceId, fileId, "EMBED", "COMPLETED");
    await markStep(workspaceId, fileId, "STORE", "COMPLETED");

    await knowledgeRepository.setFileStatus(fileId, "COMPLETED");
    const file = await knowledgeRepository.findFile(fileId);
    if (file) await knowledgeRepository.refreshBaseStatus(file.knowledgeBaseId);

    eventBus.emitEvent("KnowledgeUploaded", { workspaceId, fileId, chunksCreated: created });

    return { success: true, chunksCreated: created };
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشلت معالجة الملف";
    console.error(`[file-processing] failed for file ${fileId}:`, error);
    await knowledgeRepository.setFileStatus(fileId, "FAILED").catch(() => null);
    const file = await knowledgeRepository.findFile(fileId).catch(() => null);
    if (file) await knowledgeRepository.refreshBaseStatus(file.knowledgeBaseId).catch(() => null);
    return { success: false, chunksCreated: 0, error: message };
  }
}
