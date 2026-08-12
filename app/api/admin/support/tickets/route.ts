import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { supportTicketService } from "@/features/support/services/support-ticket.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";
import type { TicketPriority, TicketStatus } from "@prisma/client";

const VALID_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const VALID_PRIORITIES: TicketPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const priorityParam = searchParams.get("priority");
    const assignedAdminId = searchParams.get("assignedAdminId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const page = Number(searchParams.get("page") ?? "1") || 1;

    const status = VALID_STATUSES.find((s) => s === statusParam);
    const priority = VALID_PRIORITIES.find((p) => p === priorityParam);

    const result = await supportTicketService.listForAdmin({ status, priority, assignedAdminId, search, page });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
