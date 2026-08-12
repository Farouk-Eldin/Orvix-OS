import { requireWorkspace, UnauthorizedError, NoWorkspaceError } from "@/features/authentication/services/get-current-workspace";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const activity = await dashboardService.getRecentActivity(workspace.id);
    return apiSuccess(activity);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("GET /api/dashboard/recent-activity failed:", error);
    return apiErrors.serverError();
  }
}
