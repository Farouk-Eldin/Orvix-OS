import {
  requireSuperAdmin,
  UnauthorizedError,
  NotSuperAdminError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const payments = await prisma.paymentLog.findMany({
      where: statusFilter ? { status: statusFilter as "PENDING" | "PAID" | "FAILED" } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { workspace: { select: { name: true, slug: true } } },
    });

    return apiSuccess(payments);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
