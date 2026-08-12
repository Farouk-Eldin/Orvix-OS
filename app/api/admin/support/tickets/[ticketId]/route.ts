import { z } from "zod";

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { supportTicketService, TicketNotFoundError } from "@/features/support/services/support-ticket.service";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  /** "self" assigns to the calling admin — a plain id assigns to any admin — null unassigns. */
  assignedAdminId: z.string().nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    await requireSuperAdmin();
    const { ticketId } = await params;
    const ticket = await supportTicketService.getForAdmin(ticketId);
    return apiSuccess(ticket);
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    if (error instanceof TicketNotFoundError) return apiErrors.notFound("التذكرة");
    return apiErrors.serverError();
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { user } = await requireSuperAdmin();
    const { ticketId } = await params;

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    let ticket;
    if (parsed.data.status) {
      ticket = await supportTicketService.setStatus(ticketId, parsed.data.status);
    }
    if (parsed.data.priority) {
      ticket = await supportTicketService.setPriority(ticketId, parsed.data.priority);
    }
    if (parsed.data.assignedAdminId !== undefined) {
      const targetId = parsed.data.assignedAdminId === "self" ? user.id : parsed.data.assignedAdminId;
      ticket = await supportTicketService.assign(ticketId, targetId);
    }

    if (!ticket) return apiError("مفيش حاجة اتحدّثت", [], 400);
    return apiSuccess(ticket, "تم التحديث");
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    if (error instanceof TicketNotFoundError) return apiErrors.notFound("التذكرة");
    return apiErrors.serverError();
  }
}
