// PROPOSAL — target path: app/api/v1/coupons/check/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { couponService } from "@/features/billing/services/coupon.service";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const checkSchema = z.object({ code: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`coupon-check:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = checkSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", [], 400);

    const result = await couponService.validate(parsed.data.code.toUpperCase(), workspace.id);
    return apiSuccess(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
