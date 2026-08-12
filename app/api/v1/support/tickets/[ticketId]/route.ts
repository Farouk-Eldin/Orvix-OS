import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { supportTicketService, TicketNotFoundError } from "@/features/support/services/support-ticket.service";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { ticketId } = await params;
    const ticket = await supportTicketService.getForWorkspace(ticketId, workspace.id);
    return apiSuccess(ticket);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof TicketNotFoundError) return apiErrors.notFound("التذكرة");
    return apiErrors.serverError();
  }
}

/** The only workspace-side mutation on the ticket itself is closing it — everything else is a reply (see messages/route.ts). */
export async function PATCH(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { ticketId } = await params;
    const json = await request.json().catch(() => ({}));

    if (json?.action !== "close") {
      return apiError("طلب غير مفهوم", [], 400);
    }

    const ticket = await supportTicketService.closeAsWorkspace({ ticketId, workspaceId: workspace.id });
    return apiSuccess(ticket, "تم إغلاق التذكرة");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof TicketNotFoundError) return apiErrors.notFound("التذكرة");
    return apiErrors.serverError();
  }
}
