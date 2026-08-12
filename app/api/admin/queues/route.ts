import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { getQueueSnapshots } from "@/lib/queue/queue-monitor";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    await requireSuperAdmin();
    const queues = await getQueueSnapshots();
    return apiSuccess({ queues });
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
