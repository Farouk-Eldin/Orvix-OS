// PROPOSAL — target path: app/api/v1/workflows/[workflowId]/graph/route.ts (new file)
//
// Full replace, not incremental patch: deletes every existing node for
// this workflow (WorkflowEdge cascades via onDelete: Cascade on
// fromNodeId/toNodeId) and recreates from what the canvas sends. Simple
// and correct for a first version; an incremental diff would only pay
// off once workflows get large enough that redrawing the whole graph on
// every save becomes a real cost — not the case yet.
//
// Restricted to DRAFT on purpose: a PUBLISHED workflow can react to
// live events at any moment (see workflow.listeners.ts); swapping its
// graph out mid-flight is a correctness risk this route sidesteps by
// just refusing. Unpublish first (existing PATCH .../route.ts), edit,
// republish.

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

import { NODE_TYPES } from "@/lib/workflow/node-types";

const graphSchema = z.object({
  nodes: z.array(
    z.object({
      clientId: z.string(),
      type: z.enum(NODE_TYPES),
      config: z.record(z.string(), z.unknown()).default({}),
      positionX: z.number(),
      positionY: z.number(),
    })
  ),
  edges: z.array(
    z.object({
      fromClientId: z.string(),
      toClientId: z.string(),
      branch: z.enum(["true", "false"]).optional(),
    })
  ),
});

export async function PUT(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { workflowId } = await params;

    const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, workspaceId: workspace.id } });
    if (!workflow) return apiErrors.notFound("الـ Workflow");
    if (workflow.status !== "DRAFT") {
      return apiError("لازم توقف نشر الـ Workflow الأول قبل ما تعدّل الرسمة", [], 400);
    }

    const json = await request.json();
    const parsed = graphSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    const clientIds = new Set(parsed.data.nodes.map((n) => n.clientId));
    for (const edge of parsed.data.edges) {
      if (!clientIds.has(edge.fromClientId) || !clientIds.has(edge.toClientId)) {
        return apiError("edge بيشاور على node مش موجود في نفس الطلب", [], 400);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Cascades to WorkflowEdge automatically.
      await tx.workflowNode.deleteMany({ where: { workflowId } });

      const idMap = new Map<string, string>();
      for (const n of parsed.data.nodes) {
        const node = await tx.workflowNode.create({
          data: { workflowId, type: n.type, config: n.config as never, positionX: n.positionX, positionY: n.positionY },
        });
        idMap.set(n.clientId, node.id);
      }

      for (const e of parsed.data.edges) {
        await tx.workflowEdge.create({
          data: {
            workflowId,
            fromNodeId: idMap.get(e.fromClientId)!,
            toNodeId: idMap.get(e.toClientId)!,
            branch: e.branch ?? null,
          },
        });
      }

      return tx.workflow.findUniqueOrThrow({ where: { id: workflowId }, include: { nodes: true, edges: true } });
    });

    return apiSuccess(updated, "اتحفظت الرسمة");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("PUT .../workflows/[workflowId]/graph failed:", error);
    return apiErrors.serverError();
  }
}
