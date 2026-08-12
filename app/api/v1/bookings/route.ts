// PROPOSAL — target path: app/api/v1/bookings/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { bookingAvailabilityService } from "@/features/booking/services/booking-availability.service";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const STATUS_VALUES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const createBookingSchema = z.object({
  customerId: z.string().min(1),
  serviceId: z.string().min(1),
  resourceId: z.string().min(1).optional(),
  startAtIso: z.string().min(1),
  channel: z.enum(["WHATSAPP", "FACEBOOK", "INSTAGRAM", "DASHBOARD"]),
});

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWorkspace();
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get("status");
    const status = STATUS_VALUES.find((s) => s === statusParam);

    const result = await bookingRepository.listForWorkspace({
      workspaceId: workspace.id,
      status,
      search: searchParams.get("search") ?? undefined,
      page: Number(searchParams.get("page") ?? "1"),
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`bookings-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createBookingSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const booking = await bookingAvailabilityService.createBooking({
      workspaceId: workspace.id,
      customerId: parsed.data.customerId,
      serviceId: parsed.data.serviceId,
      resourceId: parsed.data.resourceId,
      startAt: new Date(parsed.data.startAtIso),
      channel: parsed.data.channel,
      createdByAI: false,
    });

    return apiSuccess(booking, "تم إنشاء الحجز");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof Error && error.message.startsWith("SLOT_UNAVAILABLE")) {
      return apiError("الميعاد ده مش متاح", [], 409);
    }
    console.error("POST /api/v1/bookings failed:", error);
    return apiErrors.serverError();
  }
}
