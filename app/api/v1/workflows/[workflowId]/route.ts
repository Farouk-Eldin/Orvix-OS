// PROPOSAL — target path: app/api/v1/workflows/[workflowId]/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { workflowRepository } from "@/lib/repositories/workflow.repository";
import { workflowVersionService } from "@/features/workflow-builder/services/workflow-version.service";
import { executeWorkflow } from "@/lib/workflow/engine";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const patchSchema = z.object({ status: z.enum(["DRAFT", "PUBLISHED", "DISABLED"]) });

export async function GET(_request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { workflowId } = await params;

    const workflow = await workflowRepository.findWithGraph(workflowId, workspace.id);
    if (!workflow) return apiErrors.notFound("الـ Workflow");

    const executions = await workflowRepository.listExecutions(workflowId);
    return apiSuccess({ workflow, executions });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { user, workspace } = await requireWorkspace();
    const { workflowId } = await params;

    const existing = await workflowRepository.findWithGraph(workflowId, workspace.id);
    if (!existing) return apiErrors.notFound("الـ Workflow");

    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    if (parsed.data.status === "PUBLISHED" && !existing.nodes.some((n) => n.type.startsWith("TRIGGER_"))) {
      return apiError("لازم يكون فيه Trigger node قبل ما تنشر الـ Workflow", [], 400);
    }

    const updated =
      parsed.data.status === "PUBLISHED"
        ? await workflowVersionService.publish(workflowId, existing.name, user.id)
        : await workflowRepository.setStatus(workflowId, parsed.data.status);

    return apiSuccess(updated, "تم التحديث");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

// Manual trigger (TRIGGER_MANUAL) — the one trigger type a person can
// fire from the dashboard instead of waiting for a real event.
export async function POST(request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { workflowId } = await params;

    const workflow = await workflowRepository.findWithGraph(workflowId, workspace.id);
    if (!workflow) return apiErrors.notFound("الـ Workflow");

    const triggerNode = workflow.nodes.find((n) => n.type === "TRIGGER_MANUAL");
    if (!triggerNode) return apiError("الـ Workflow ده مش عنده Manual Trigger", [], 400);

    const payload = await request.json().catch(() => ({}));
    const result = await executeWorkflow(
      { id: workflow.id, workspaceId: workspace.id, nodes: workflow.nodes, edges: workflow.edges },
      triggerNode.id,
      payload
    );

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/workflows/[workflowId] (manual trigger) failed:", error);
    return apiErrors.serverError();
  }
}
