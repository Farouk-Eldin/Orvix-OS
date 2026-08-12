import { requireWorkspace, UnauthorizedError, NoWorkspaceError } from "@/features/authentication/services/get-current-workspace";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const { workspace } = await requireWorkspace();
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(Number(searchParams.get("days") ?? 14), 1), 90);

    const series = await dashboardService.getFullAnalytics(workspace.id, days);
    return apiSuccess(series);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("GET /api/dashboard/analytics failed:", error);
    return apiErrors.serverError();
  }
}
