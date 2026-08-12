import { z } from "zod";

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { featureRequestRepository } from "@/lib/repositories/feature-request.repository";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const updateSchema = z.object({ status: z.enum(["PLANNED", "IN_PROGRESS", "TESTING", "RELEASED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    await requireSuperAdmin();
    const { requestId } = await params;

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().fieldErrors, 400);

    const updated = await featureRequestRepository.setStatus(requestId, parsed.data.status);
    return apiSuccess(updated, "تم التحديث");
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
