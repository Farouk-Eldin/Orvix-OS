import { headers } from "next/headers";

import { requireWorkspace, UnauthorizedError, NoWorkspaceError } from "@/features/authentication/services/get-current-workspace";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET() {
  const ip = (await headers()).get("x-forwarded-for") ?? "local";
  const { allowed } = await rateLimit(`dashboard:${ip}`, RATE_LIMITS.api);
  if (!allowed) return apiErrors.rateLimited();

  try {
    const { workspace } = await requireWorkspace();
    const summary = await dashboardService.getSummary(workspace.id);
    return apiSuccess(summary);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("GET /api/dashboard failed:", error);
    return apiErrors.serverError();
  }
}
