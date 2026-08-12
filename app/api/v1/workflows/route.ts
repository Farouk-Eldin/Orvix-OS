// PROPOSAL — target path: app/api/v1/workflows/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { workflowRepository } from "@/lib/repositories/workflow.repository";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

import { NODE_TYPES } from "@/lib/workflow/node-types";

// clientId only exists inside this request — it's how edges reference
// nodes before real database IDs exist yet. Not stored anywhere.
const createWorkflowSchema = z.object({
  name: z.string().min(1),
  nodes: z
    .array(
      z.object({
        clientId: z.string(),
        type: z.enum(NODE_TYPES),
        config: z.record(z.string(), z.unknown()).default({}),
        positionX: z.number().default(0),
        positionY: z.number().default(0),
      })
    )
    .min(1, "لازم يكون فيه Node واحد على الأقل"),
  edges: z.array(
    z.object({
      fromClientId: z.string(),
      toClientId: z.string(),
      branch: z.enum(["true", "false"]).optional(),
    })
  ),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const workflows = await workflowRepository.listForWorkspace(workspace.id);
    return apiSuccess(workflows);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`workflows-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createWorkflowSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const clientIds = new Set(parsed.data.nodes.map((n) => n.clientId));
    for (const edge of parsed.data.edges) {
      if (!clientIds.has(edge.fromClientId) || !clientIds.has(edge.toClientId)) {
        return apiError("edge بيشاور على node مش موجود", [], 400);
      }
    }

    const workflow = await prisma.$transaction(async (tx) => {
      const created = await tx.workflow.create({
        data: { workspaceId: workspace.id, name: parsed.data.name, status: "DRAFT" },
      });

      const idMap = new Map<string, string>();
      for (const n of parsed.data.nodes) {
        const node = await tx.workflowNode.create({
          data: {
            workflowId: created.id,
            type: n.type,
            config: n.config as never,
            positionX: n.positionX,
            positionY: n.positionY,
          },
        });
        idMap.set(n.clientId, node.id);
      }

      for (const e of parsed.data.edges) {
        await tx.workflowEdge.create({
          data: {
            workflowId: created.id,
            fromNodeId: idMap.get(e.fromClientId)!,
            toNodeId: idMap.get(e.toClientId)!,
            branch: e.branch ?? null,
          },
        });
      }

      return tx.workflow.findUniqueOrThrow({ where: { id: created.id }, include: { nodes: true, edges: true } });
    });

    return apiSuccess(workflow, "تم إنشاء الـ Workflow");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/workflows failed:", error);
    return apiErrors.serverError();
  }
}
