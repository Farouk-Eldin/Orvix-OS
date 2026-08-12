import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class KnowledgeRepository extends BaseRepository {
  getOrCreateDefaultBase(workspaceId: string) {
    return this.db.knowledgeBase.upsert({
      where: { id: `default_${workspaceId}` },
      update: {},
      create: { id: `default_${workspaceId}`, workspaceId, title: "قاعدة المعرفة الرئيسية", status: "EMPTY" },
    });
  }

  async findBaseForWorkspace(workspaceId: string) {
    const existing = await this.db.knowledgeBase.findFirst({ where: { workspaceId } });
    return existing ?? this.getOrCreateDefaultBase(workspaceId);
  }

  listFiles(knowledgeBaseId: string) {
    return this.db.knowledgeFile.findMany({
      where: { knowledgeBaseId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    });
  }

  createFile(data: Prisma.KnowledgeFileCreateInput) {
    return this.db.knowledgeFile.create({ data });
  }

  setFileStatus(fileId: string, status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED") {
    return this.db.knowledgeFile.update({ where: { id: fileId }, data: { processingStatus: status } });
  }

  deleteFile(fileId: string) {
    return this.db.knowledgeFile.delete({ where: { id: fileId } });
  }

  findFile(fileId: string) {
    return this.db.knowledgeFile.findUnique({ where: { id: fileId }, include: { knowledgeBase: true } });
  }

  createChunks(data: Prisma.KnowledgeChunkCreateManyInput[]) {
    return this.db.knowledgeChunk.createMany({ data });
  }

  listChunksForFile(fileId: string) {
    return this.db.knowledgeChunk.findMany({
      where: { fileId },
      orderBy: { chunkIndex: "asc" },
      include: { embedding: true },
    });
  }

  createEmbeddingRecord(data: Prisma.EmbeddingCreateInput) {
    return this.db.embedding.create({ data });
  }

  async refreshBaseStatus(knowledgeBaseId: string) {
    const files = await this.db.knowledgeFile.findMany({
      where: { knowledgeBaseId },
      select: { processingStatus: true },
    });
    const status =
      files.length === 0
        ? "EMPTY"
        : files.some((f) => f.processingStatus === "PROCESSING" || f.processingStatus === "PENDING")
          ? "PROCESSING"
          : files.some((f) => f.processingStatus === "FAILED")
            ? "FAILED"
            : "READY";
    return this.db.knowledgeBase.update({ where: { id: knowledgeBaseId }, data: { status } });
  }

  // --- FAQ ---
  listFaqs(knowledgeBaseId: string) {
    return this.db.knowledgeFAQ.findMany({ where: { knowledgeBaseId }, orderBy: { createdAt: "desc" } });
  }

  createFaq(data: Prisma.KnowledgeFAQCreateInput) {
    return this.db.knowledgeFAQ.create({ data });
  }

  updateFaq(id: string, data: Prisma.KnowledgeFAQUpdateInput) {
    return this.db.knowledgeFAQ.update({ where: { id }, data });
  }

  deleteFaq(id: string) {
    return this.db.knowledgeFAQ.delete({ where: { id } });
  }

  // --- Dashboard counts ---
  async getCounts(workspaceId: string) {
    const base = await this.findBaseForWorkspace(workspaceId);
    const [filesCount, faqsCount, chunksCount] = await Promise.all([
      this.db.knowledgeFile.count({ where: { knowledgeBaseId: base.id } }),
      this.db.knowledgeFAQ.count({ where: { knowledgeBaseId: base.id } }),
      this.db.knowledgeChunk.count({ where: { file: { knowledgeBaseId: base.id } } }),
    ]);
    return { filesCount, faqsCount, chunksCount, status: base.status };
  }
}

export const knowledgeRepository = new KnowledgeRepository();
