import { z } from "zod";

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { withdrawalRepository } from "@/lib/repositories/withdrawal.repository";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const updateSchema = z.object({
  status: z.enum(["APPROVED", "PAID", "REJECTED"]),
  adminNote: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ withdrawalId: string }> }) {
  try {
    await requireSuperAdmin();
    const { withdrawalId } = await params;

    const existing = await withdrawalRepository.findById(withdrawalId);
    if (!existing) return apiErrors.notFound("طلب السحب");

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().fieldErrors, 400);

    const withdrawal = await withdrawalRepository.setStatus(withdrawalId, parsed.data.status, parsed.data.adminNote);
    return apiSuccess(withdrawal, "تم التحديث");
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
