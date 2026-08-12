import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { workflowRepository } from "@/lib/repositories/workflow.repository";
import { workflowVersionService } from "@/features/workflow-builder/services/workflow-version.service";
import { apiSuccess, apiErrors, apiError } from "@/lib/api-response";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ workflowId: string; versionId: string }> }
) {
  try {
    const { user, workspace } = await requireWorkspace();
    const { workflowId, versionId } = await params;

    const workflow = await workflowRepository.findWithGraph(workflowId, workspace.id);
    if (!workflow) return apiErrors.notFound("الـ Workflow");

    try {
      const restored = await workflowVersionService.rollback(workflowId, versionId, user.id);
      return apiSuccess(restored, "تم استرجاع النسخة دي، وبقت النسخة الحالية");
    } catch (error) {
      return apiError(error instanceof Error ? error.message : "تعذّر الاسترجاع", [], 400);
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
