import {
  requireSuperAdmin,
  UnauthorizedError,
  NotSuperAdminError,
} from "@/features/authentication/services/get-current-workspace";
import { workspaceAdminService } from "@/features/admin/services/workspace-admin.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const result = await workspaceAdminService.list({
      search: searchParams.get("search") ?? undefined,
      page: Number(searchParams.get("page") ?? "1"),
    });
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    console.error("GET /api/v1/admin/workspaces failed:", error);
    return apiErrors.serverError();
  }
}
