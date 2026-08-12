import {
  requireSuperAdmin,
  UnauthorizedError,
  NotSuperAdminError,
} from "@/features/authentication/services/get-current-workspace";
import { adminStatsService } from "@/features/admin/services/admin-stats.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    await requireSuperAdmin();
    const [overview, aiProviders] = await Promise.all([
      adminStatsService.getOverview(),
      adminStatsService.getAiProviderStats(),
    ]);
    return apiSuccess({ overview, aiProviders });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    console.error("GET /api/v1/admin/stats failed:", error);
    return apiErrors.serverError();
  }
}
