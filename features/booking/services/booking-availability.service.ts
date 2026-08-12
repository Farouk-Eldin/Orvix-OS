import { bookingRepository } from "@/lib/repositories/booking.repository";
import { eventBus } from "@/lib/events/event-bus";

// PROPOSAL — target path: features/booking/services/booking-availability.service.ts
// REVISED: now goes through bookingRepository instead of calling Prisma
// directly, matching the "Services -> Repositories -> Prisma" rule in
// their own base.repository.ts. If you already grabbed the earlier
// version of this file from this chat, use this one instead.
//
// Requires the models in booking-core-schema-proposal.prisma, plus
// Workspace.defaultWorkingHours (same shape as Resource.workingHours).
//
// workingHours shape — documented here since this is a new field:
//   {
//     "sun": [{ "open": "09:00", "close": "17:00" }],
//     "mon": [{ "open": "09:00", "close": "13:00" }, { "open": "16:00", "close": "20:00" }],
//     "fri": []
//   }

export type DayRanges = { open: string; close: string }[];
export type WorkingHours = Partial<Record<"sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat", DayRanges>>;

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const SLOT_STEP_MIN = 15;
const SEARCH_HORIZON_DAYS = 14;

export function toMinutes(hhmm: string) {
  const parts = hhmm.split(":").map(Number);
  const h = parts[0];
  const m = parts[1];
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`صيغة وقت غير صحيحة: "${hhmm}" — المتوقع HH:mm`);
  }
  return h * 60 + m;
}

export function isWithinWorkingHours(startAt: Date, endAt: Date, hours: WorkingHours | null) {
  if (!hours) return false;
  if (startAt.toDateString() !== endAt.toDateString()) return false; // no overnight bookings for now

  const dayKey = DAY_KEYS[startAt.getDay()];
  const ranges = dayKey ? (hours[dayKey] ?? []) : [];
  const startMin = startAt.getHours() * 60 + startAt.getMinutes();
  const endMin = endAt.getHours() * 60 + endAt.getMinutes();

  return ranges.some((r) => toMinutes(r.open) <= startMin && endMin <= toMinutes(r.close));
}

type SlotParams = { workspaceId: string; serviceId: string; resourceId?: string; startAt: Date };

export const bookingAvailabilityService = {
  // Internal single-slot check — no fallback lookup inside it, so the
  // search loop below can call this safely without cascading searches.
  async isSlotAvailable(params: SlotParams) {
    const service = await bookingRepository.findServiceById(params.serviceId);
    const endAt = new Date(params.startAt.getTime() + service.durationMin * 60000);

    const resource = params.resourceId ? await bookingRepository.findResourceById(params.resourceId) : null;
    const hours = resource
      ? (resource.workingHours as WorkingHours)
      : (((await bookingRepository.findWorkspaceHours(params.workspaceId))?.defaultWorkingHours as
          | WorkingHours
          | undefined) ?? null);

    if (!isWithinWorkingHours(params.startAt, endAt, hours)) {
      return { ok: false as const, endAt, reason: "OUTSIDE_WORKING_HOURS" as const };
    }

    const maxPerSlot = resource?.maxPerSlot ?? 1;

    const overlapping = await bookingRepository.countOverlapping({
      workspaceId: params.workspaceId,
      resourceId: params.resourceId,
      startAt: params.startAt,
      endAt,
    });

    return overlapping < maxPerSlot
      ? { ok: true as const, endAt }
      : { ok: false as const, endAt, reason: "SLOT_FULL" as const };
  },

  async checkAvailability(params: SlotParams) {
    const result = await this.isSlotAvailable(params);
    if (result.ok) return { available: true as const, endAt: result.endAt };

    return {
      available: false as const,
      reason: result.reason,
      nearestSlot: await this.findNearestSlot(params),
    };
  },

  // Walks forward in 15-minute steps, up to 14 days, calling
  // isSlotAvailable only — never checkAvailability — so a run of busy
  // slots can't trigger nested searches.
  async findNearestSlot(params: SlotParams): Promise<Date | null> {
    const horizon = new Date(params.startAt.getTime() + SEARCH_HORIZON_DAYS * 24 * 60 * 60000);
    let candidate = new Date(params.startAt.getTime() + SLOT_STEP_MIN * 60000);

    while (candidate < horizon) {
      const result = await this.isSlotAvailable({ ...params, startAt: candidate });
      if (result.ok) return candidate;
      candidate = new Date(candidate.getTime() + SLOT_STEP_MIN * 60000);
    }
    return null; // nothing free in the next two weeks — surface this as-is, don't invent a slot
  },

  async createBooking(params: SlotParams & { customerId: string; channel: string; createdByAI?: boolean }) {
    const check = await this.checkAvailability(params);
    if (!check.available) {
      throw new Error(`SLOT_UNAVAILABLE:${check.reason}`);
    }

    const booking = await bookingRepository.create({
      workspace: { connect: { id: params.workspaceId } },
      customer: { connect: { id: params.customerId } },
      service: { connect: { id: params.serviceId } },
      ...(params.resourceId ? { resource: { connect: { id: params.resourceId } } } : {}),
      channel: params.channel as never, // cast to your real ChannelType enum
      startAt: params.startAt,
      endAt: check.endAt,
      createdByAI: params.createdByAI ?? false,
      status: "PENDING",
    });

    eventBus.emitEvent("AppointmentCreated", { workspaceId: params.workspaceId, appointmentId: booking.id });
    return booking;
  },
};
