import { prisma } from "@/lib/prisma";

export const storageAdminService = {
  async getOverview() {
    const [totalAgg, byBase] = await Promise.all([
      prisma.knowledgeFile.aggregate({ _sum: { fileSize: true }, _count: true }),
      prisma.knowledgeFile.groupBy({ by: ["knowledgeBaseId"], _sum: { fileSize: true }, _count: true }),
    ]);

    const knowledgeBaseIds = byBase.map((b) => b.knowledgeBaseId);
    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: { id: { in: knowledgeBaseIds } },
      select: { id: true, workspace: { select: { id: true, name: true } } },
    });
    const baseToWorkspace = new Map(knowledgeBases.map((kb) => [kb.id, kb.workspace]));

    const byWorkspace = new Map<string, { workspaceId: string; workspaceName: string; bytes: number; fileCount: number }>();
    for (const row of byBase) {
      const workspace = baseToWorkspace.get(row.knowledgeBaseId);
      if (!workspace) continue;
      const existing = byWorkspace.get(workspace.id) ?? {
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        bytes: 0,
        fileCount: 0,
      };
      existing.bytes += row._sum.fileSize ?? 0;
      existing.fileCount += row._count;
      byWorkspace.set(workspace.id, existing);
    }

    const topWorkspaces = [...byWorkspace.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 15);

    return {
      totalBytes: totalAgg._sum.fileSize ?? 0,
      totalFiles: totalAgg._count,
      topWorkspaces,
    };
  },
};
