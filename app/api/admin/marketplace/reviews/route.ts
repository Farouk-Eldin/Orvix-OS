// PROPOSAL — target path: app/api/admin/marketplace/reviews/route.ts (new file)

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { marketplaceRepository } from "@/lib/repositories/marketplace.repository";
import { apiErrors, apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    await requireSuperAdmin();
    const pending = await marketplaceRepository.listPendingReview();
    return apiSuccess(pending);
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
