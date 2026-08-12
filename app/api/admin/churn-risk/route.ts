// PROPOSAL — target path: app/api/admin/churn-risk/route.ts (new file)

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { churnPredictionService } from "@/features/admin/services/churn-prediction.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    await requireSuperAdmin();
    const atRisk = await churnPredictionService.listAtRisk();
    return apiSuccess(atRisk);
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
