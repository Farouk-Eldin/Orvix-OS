// PROPOSAL — target path: app/api/v1/marketplace/apps/[appId]/install/route.ts (new file)

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { marketplaceService } from "@/features/marketplace/services/marketplace.service";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(_request: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { appId } = await params;

    const { allowed } = await rateLimit(`marketplace-install:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const install = await marketplaceService.install(appId, workspace.id);
    return apiSuccess(install, "اتثبت التطبيق");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof Error) return apiError(error.message, [], 400);
    return apiErrors.serverError();
  }
}
