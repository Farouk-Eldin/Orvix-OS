import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { crmReportsService } from "@/features/crm/services/crm-reports.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWorkspace();
    const { searchParams } = new URL(request.url);
    const periodDays = Number(searchParams.get("days") ?? "30") || 30;

    const overview = await crmReportsService.getOverview(workspace.id, periodDays);
    return apiSuccess(overview);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
