// PROPOSAL — target path: app/api/admin/nps/route.ts (new file)

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { npsService } from "@/features/admin/services/nps.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    await requireSuperAdmin();
    const result = await npsService.getAggregateScore();
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
