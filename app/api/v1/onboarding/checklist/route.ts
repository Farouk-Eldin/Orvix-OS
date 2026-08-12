// PROPOSAL — target path: app/api/v1/onboarding/checklist/route.ts (new file)

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { checklistService } from "@/features/onboarding/services/checklist.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const progress = await checklistService.getProgress(workspace.id);
    return apiSuccess(progress);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
