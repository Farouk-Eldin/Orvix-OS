import { requireWorkspace, UnauthorizedError, NoWorkspaceError } from "@/features/authentication/services/get-current-workspace";
import { subscriptionRepository } from "@/lib/repositories/subscription.repository";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const subscription = await subscriptionRepository.findByWorkspaceId(workspace.id);
    if (!subscription) return apiErrors.notFound("الاشتراك");
    return apiSuccess(subscription);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("GET /api/subscription failed:", error);
    return apiErrors.serverError();
  }
}
