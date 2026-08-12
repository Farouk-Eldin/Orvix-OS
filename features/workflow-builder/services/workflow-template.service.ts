// PROPOSAL — target path: features/workflow-builder/services/workflow-template.service.ts (new file)

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface TemplateNode {
  clientId: string;
  type: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}
interface TemplateEdge {
  fromClientId: string;
  toClientId: string;
  branch: "true" | "false" | null;
}

// Fields that only mean something inside the ONE workspace a workflow
// was built in — a serviceId or customerId from workspace A is
// meaningless (or actively wrong) once installed into workspace B.
// Template-placeholder syntax ({{trigger.x}}) survives sanitization
// since it's resolved fresh at execution time either way, not baked in.
const WORKSPACE_SPECIFIC_KEYS = new Set(["customerId", "serviceId", "resourceId"]);

function sanitizeConfig(config: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    const isTemplatePlaceholder = typeof value === "string" && value.startsWith("{{") && value.endsWith("}}");
    clean[key] = WORKSPACE_SPECIFIC_KEYS.has(key) && !isTemplatePlaceholder ? "" : value;
  }
  return clean;
}

export const workflowTemplateService = {
  listAvailable(workspaceId: string) {
    return prisma.workflowTemplate.findMany({
      where: { OR: [{ isOfficial: true }, { workspaceId }] },
      orderBy: [{ isOfficial: "desc" }, { createdAt: "desc" }],
    });
  },

  async saveAsTemplate(workflowId: string, workspaceId: string, name: string, description?: string) {
    const workflow = await prisma.workflow.findFirstOrThrow({
      where: { id: workflowId, workspaceId },
      include: { nodes: true, edges: true },
    });

    const graphSnapshot = {
      nodes: workflow.nodes.map((n) => ({
        clientId: n.id, // stable within this snapshot only, re-mapped fresh on install
        type: n.type,
        config: sanitizeConfig(n.config as unknown as Record<string, unknown>),
        positionX: n.positionX,
        positionY: n.positionY,
      })),
      edges: workflow.edges.map((e) => ({
        fromClientId: e.fromNodeId,
        toClientId: e.toNodeId,
        branch: (e.branch as "true" | "false" | null) ?? null,
      })),
    };

    return prisma.workflowTemplate.create({
      data: {
        workspaceId,
        name,
        description,
        category: "custom",
        isOfficial: false,
        graphSnapshot: graphSnapshot as unknown as Prisma.InputJsonValue,
      },
    });
  },

  // Creates a fresh DRAFT workflow for the installing workspace — the
  // person still needs to fill in the sanitized fields (pick a real
  // service/customer) before publishing, same as building one from scratch.
  async install(templateId: string, workspaceId: string, name: string) {
    const template = await prisma.workflowTemplate.findFirstOrThrow({
      where: { id: templateId, OR: [{ isOfficial: true }, { workspaceId }] },
    });

    const snapshot = template.graphSnapshot as unknown as { nodes: TemplateNode[]; edges: TemplateEdge[] };

    return prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({ data: { workspaceId, name, status: "DRAFT" } });

      const idMap = new Map<string, string>();
      for (const n of snapshot.nodes) {
        const node = await tx.workflowNode.create({
          data: {
            workflowId: workflow.id,
            type: n.type as never,
            config: n.config as never,
            positionX: n.positionX,
            positionY: n.positionY,
          },
        });
        idMap.set(n.clientId, node.id);
      }

      for (const e of snapshot.edges) {
        await tx.workflowEdge.create({
          data: {
            workflowId: workflow.id,
            fromNodeId: idMap.get(e.fromClientId)!,
            toNodeId: idMap.get(e.toClientId)!,
            branch: e.branch ?? null,
          },
        });
      }

      return tx.workflow.findUniqueOrThrow({ where: { id: workflow.id }, include: { nodes: true, edges: true } });
    });
  },
};
