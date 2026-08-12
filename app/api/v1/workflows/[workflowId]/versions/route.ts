import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { workflowRepository } from "@/lib/repositories/workflow.repository";
import { workflowVersionService } from "@/features/workflow-builder/services/workflow-version.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ workflowId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { workflowId } = await params;

    const workflow = await workflowRepository.findWithGraph(workflowId, workspace.id);
    if (!workflow) return apiErrors.notFound("الـ Workflow");

    const versions = await workflowVersionService.listVersions(workflowId);
    return apiSuccess({ versions });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
