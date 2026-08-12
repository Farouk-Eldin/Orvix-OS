// PROPOSAL — target path: app/api/v1/branding/domain/verify/route.ts (new file)

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { domainVerificationService } from "@/features/enterprise/services/domain-verification.service";
import { apiErrors, apiSuccess } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST() {
  try {
    const { workspace } = await requireWorkspace();

    // DNS lookups are real network calls — rate-limited so a "check
    // again" button can't be hammered into a lookup flood.
    const { allowed } = await rateLimit(`domain-verify:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const result = await domainVerificationService.checkVerification(workspace.id);
    return apiSuccess(
      result,
      result.status === "VERIFIED" ? "الدومين اتأكد!" : "لسه معملناش لقاه — استنى شوية للـ DNS يتحدّث وجرّب تاني"
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
