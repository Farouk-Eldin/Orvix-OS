// PROPOSAL — target path: app/api/v1/bookings/[bookingId]/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { eventBus } from "@/lib/events/event-bus";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const updateBookingSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  startAtIso: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { bookingId } = await params;

    const { allowed } = await rateLimit(`bookings-update:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const existing = await bookingRepository.findByIdInWorkspace(bookingId, workspace.id);
    if (!existing) return apiErrors.notFound("الحجز");

    const json = await request.json();
    const parsed = updateBookingSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const updated = await bookingRepository.update(existing.id, {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.startAtIso ? { startAt: new Date(parsed.data.startAtIso) } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
    });

    if (parsed.data.status) {
      eventBus.emitEvent("BookingStatusChanged", {
        workspaceId: workspace.id,
        bookingId: updated.id,
        status: parsed.data.status,
      });
    }

    return apiSuccess(updated, "تم تحديث الحجز");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("PATCH /api/v1/bookings/[bookingId] failed:", error);
    return apiErrors.serverError();
  }
}
