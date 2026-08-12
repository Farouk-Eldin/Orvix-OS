import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { storageAdminService } from "@/features/admin/services/storage-admin.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    await requireSuperAdmin();
    const overview = await storageAdminService.getOverview();
    return apiSuccess(overview);
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
