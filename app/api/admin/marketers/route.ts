// PROPOSAL — target path: app/api/admin/marketers/route.ts (new file)
// Under app/api/admin — matches your existing admin route grouping
// (isSuperAdmin-gated), not app/api/v1 (workspace-scoped).

import { z } from "zod";

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { referralRepository } from "@/lib/repositories/referral.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const createMarketerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  referralCode: z
    .string()
    .min(4)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, "الكود يقبل حروف وأرقام بس"),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const marketers = await referralRepository.listMarketersWithStats();

    const withStats = marketers.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      referralCode: m.referralCode,
      status: m.status,
      totalReferrals: m._count.referrals,
      converted: m.referrals.filter((r) => r.convertedAt).length,
    }));

    return apiSuccess(withStats);
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    await requireSuperAdmin();

    const json = await request.json();
    const parsed = createMarketerSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const marketer = await referralRepository.createMarketer(parsed.data);
    return apiSuccess(marketer, "تم إضافة المسوّق");
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return apiError("الكود ده أو الإيميل مستخدم بالفعل", [], 409);
    }
    return apiErrors.serverError();
  }
}
