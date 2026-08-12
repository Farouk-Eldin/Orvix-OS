import { z } from "zod";

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { affiliateBalanceService } from "@/features/admin/services/affiliate-balance.service";
import { withdrawalRepository } from "@/lib/repositories/withdrawal.repository";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const createSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(["VODAFONE_CASH", "BANK_TRANSFER"]),
  accountDetails: z.string().min(3, "رقم المحفظة أو بيانات الحساب مطلوبة"),
});

export async function POST(request: Request, { params }: { params: Promise<{ marketerId: string }> }) {
  try {
    await requireSuperAdmin();
    const { marketerId } = await params;

    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().fieldErrors, 400);

    const balance = await affiliateBalanceService.getBalance(marketerId);
    if (!balance) return apiErrors.notFound("المسوّق");
    if (parsed.data.amount > balance.availableBalance) {
      return apiError(`الرصيد المتاح ${balance.availableBalance} ج.م بس`, [], 400);
    }

    const withdrawal = await withdrawalRepository.create({
      marketer: { connect: { id: marketerId } },
      amount: parsed.data.amount,
      method: parsed.data.method,
      accountDetails: parsed.data.accountDetails,
    });

    return apiSuccess(withdrawal, "تم تسجيل طلب السحب");
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
