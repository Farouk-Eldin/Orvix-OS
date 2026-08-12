import { systemHealthService } from "@/features/dashboard/services/system-health.service";
import { apiSuccess } from "@/lib/api-response";

export async function GET() {
  const services = await systemHealthService.checkAll();
  const overall = services.some((s) => s.status === "OFFLINE" && s.service === "DATABASE")
    ? "OFFLINE"
    : services.some((s) => s.status !== "ONLINE")
      ? "DEGRADED"
      : "ONLINE";

  return apiSuccess({ overall, services, checkedAt: new Date().toISOString() });
}
