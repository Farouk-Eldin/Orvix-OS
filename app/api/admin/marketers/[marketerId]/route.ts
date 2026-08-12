import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { affiliateBalanceService } from "@/features/admin/services/affiliate-balance.service";
import { withdrawalRepository } from "@/lib/repositories/withdrawal.repository";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ marketerId: string }> }) {
  try {
    await requireSuperAdmin();
    const { marketerId } = await params;

    const balance = await affiliateBalanceService.getBalance(marketerId);
    if (!balance) return apiErrors.notFound("المسوّق");

    const withdrawals = await withdrawalRepository.listForMarketer(marketerId);

    return apiSuccess({ ...balance, withdrawals });
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
