// PROPOSAL — target path: lib/repositories/workflow.repository.ts (new file)

import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class WorkflowRepository extends BaseRepository {
  listForWorkspace(workspaceId: string) {
    return this.db.workflow.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  }

  findWithGraph(workflowId: string, workspaceId: string) {
    return this.db.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      include: { nodes: true, edges: true },
    });
  }

  // Every workflow that could react to a given trigger type, published
  // only — drafts never fire on real events.
  findPublishedByTriggerType(workspaceId: string, triggerType: string) {
    return this.db.workflow.findMany({
      where: {
        workspaceId,
        status: "PUBLISHED",
        nodes: { some: { type: triggerType as never } },
      },
      include: { nodes: true, edges: true },
    });
  }

  create(data: Prisma.WorkflowCreateInput) {
    return this.db.workflow.create({ data, include: { nodes: true, edges: true } });
  }

  setStatus(workflowId: string, status: "DRAFT" | "PUBLISHED" | "DISABLED") {
    return this.db.workflow.update({ where: { id: workflowId }, data: { status } });
  }

  createExecution(data: Prisma.WorkflowExecutionCreateInput) {
    return this.db.workflowExecution.create({ data });
  }

  updateExecution(executionId: string, data: Prisma.WorkflowExecutionUpdateInput) {
    return this.db.workflowExecution.update({ where: { id: executionId }, data });
  }

  listExecutions(workflowId: string, limit = 20) {
    return this.db.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }

  /**
   * Wipes and rewrites a workflow's nodes/edges from a graph keyed by
   * caller-supplied local ids (not real db ids, which don't exist yet).
   * Shared by rollback (snapshot -> live graph) and the AI-assisted
   * builder (generated graph -> live graph) so there's one transactional
   * place this happens, not two slightly-different copies of it.
   */
  async replaceGraph(
    workflowId: string,
    graph: {
      nodes: { localId: string; type: string; config: unknown; positionX: number; positionY: number }[];
      edges: { from: string; to: string; branch?: string | null }[];
    }
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.workflowEdge.deleteMany({ where: { workflowId } });
      await tx.workflowNode.deleteMany({ where: { workflowId } });

      const idMap = new Map<string, string>();
      for (const node of graph.nodes) {
        const created = await tx.workflowNode.create({
          data: {
            workflowId,
            type: node.type as never,
            config: node.config as never,
            positionX: node.positionX,
            positionY: node.positionY,
          },
        });
        idMap.set(node.localId, created.id);
      }
      for (const edge of graph.edges) {
        const fromId = idMap.get(edge.from);
        const toId = idMap.get(edge.to);
        if (!fromId || !toId) continue;
        await tx.workflowEdge.create({ data: { workflowId, fromNodeId: fromId, toNodeId: toId, branch: edge.branch ?? null } });
      }

      return tx.workflow.findUniqueOrThrow({ where: { id: workflowId }, include: { nodes: true, edges: true } });
    });
  }

  async createVersionSnapshot(workflowId: string, name: string, publishedByUserId: string | null) {
    const workflow = await this.db.workflow.findUniqueOrThrow({
      where: { id: workflowId },
      include: { nodes: true, edges: true },
    });
    const versionNumber = (await this.db.workflowVersion.count({ where: { workflowId } })) + 1;

    return this.db.workflowVersion.create({
      data: {
        workflowId,
        versionNumber,
        name,
        publishedByUserId,
        nodesSnapshot: workflow.nodes.map((n) => ({
          localId: n.id,
          type: n.type,
          config: n.config,
          positionX: n.positionX,
          positionY: n.positionY,
        })),
        edgesSnapshot: workflow.edges.map((e) => ({ from: e.fromNodeId, to: e.toNodeId, branch: e.branch })),
      },
    });
  }

  listVersions(workflowId: string) {
    return this.db.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { versionNumber: "desc" },
      include: { publishedBy: { select: { id: true, name: true } } },
    });
  }

  getVersion(versionId: string, workflowId: string) {
    return this.db.workflowVersion.findFirst({ where: { id: versionId, workflowId } });
  }
}

export const workflowRepository = new WorkflowRepository();
