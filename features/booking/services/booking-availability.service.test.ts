// PROPOSAL — target path: features/booking/services/booking-availability.service.test.ts (new file)

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isWithinWorkingHours,
  toMinutes,
  type WorkingHours,
} from "./booking-availability.service";

describe("toMinutes", () => {
  it("converts HH:mm to minutes since midnight", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("23:59")).toBe(1439);
  });
});

describe("isWithinWorkingHours", () => {
  const hours: WorkingHours = {
    // split shift — morning + evening, closed lunch
    mon: [
      { open: "09:00", close: "13:00" },
      { open: "16:00", close: "20:00" },
    ],
    fri: [],
  };

  it("accepts a booking inside the morning shift", () => {
    const start = new Date("2026-07-13T10:00:00"); // a Monday
    const end = new Date("2026-07-13T10:30:00");
    expect(isWithinWorkingHours(start, end, hours)).toBe(true);
  });

  it("rejects a booking spanning the lunch gap between shifts", () => {
    const start = new Date("2026-07-13T12:30:00");
    const end = new Date("2026-07-13T13:30:00");
    expect(isWithinWorkingHours(start, end, hours)).toBe(false);
  });

  it("accepts a booking inside the evening shift", () => {
    const start = new Date("2026-07-13T17:00:00");
    const end = new Date("2026-07-13T18:00:00");
    expect(isWithinWorkingHours(start, end, hours)).toBe(true);
  });

  it("rejects a closed day even with empty (not missing) ranges", () => {
    const start = new Date("2026-07-17T10:00:00"); // a Friday
    const end = new Date("2026-07-17T10:30:00");
    expect(isWithinWorkingHours(start, end, hours)).toBe(false);
  });

  it("rejects a day with no entry at all", () => {
    const start = new Date("2026-07-14T10:00:00"); // a Tuesday — not in `hours`
    const end = new Date("2026-07-14T10:30:00");
    expect(isWithinWorkingHours(start, end, hours)).toBe(false);
  });

  it("rejects a booking that crosses midnight", () => {
    const start = new Date("2026-07-13T23:00:00");
    const end = new Date("2026-07-14T00:30:00");
    expect(isWithinWorkingHours(start, end, hours)).toBe(false);
  });

  it("rejects everything when hours is null (no resource, no workspace default set)", () => {
    const start = new Date("2026-07-13T10:00:00");
    const end = new Date("2026-07-13T10:30:00");
    expect(isWithinWorkingHours(start, end, null)).toBe(false);
  });
});

// ------------------------------------------------------------
// Higher-level flow, with the repository mocked. Mainly here to guard
// against the recursion bug from the first draft of this file: the
// search loop in findNearestSlot must call isSlotAvailable only, never
// checkAvailability — otherwise a run of busy slots blows up into
// nested nearest-slot searches instead of a flat 15-minute walk.
// ------------------------------------------------------------
vi.mock("@/lib/repositories/booking.repository", () => ({
  bookingRepository: {
    findServiceById: vi.fn(),
    findResourceById: vi.fn(),
    findWorkspaceHours: vi.fn(),
    countOverlapping: vi.fn(),
    create: vi.fn(),
  },
}));

describe("bookingAvailabilityService.findNearestSlot", () => {
  beforeEach(() => vi.resetModules());

  it("walks forward in flat 15-minute steps without recursing into checkAvailability", async () => {
    const { bookingRepository } = await import("@/lib/repositories/booking.repository");
    const { bookingAvailabilityService } = await import("./booking-availability.service");

    vi.mocked(bookingRepository.findServiceById).mockResolvedValue({
      id: "svc1",
      durationMin: 30,
    } as never);
    vi.mocked(bookingRepository.findResourceById).mockResolvedValue(null as never);
    vi.mocked(bookingRepository.findWorkspaceHours).mockResolvedValue({
      defaultWorkingHours: { mon: [{ open: "09:00", close: "20:00" }] },
    } as never);

    // findNearestSlot starts checking at start+15min, not at start itself.
    // First two candidates full, third one free — call count proves the
    // walk is flat (3 countOverlapping calls), not exponential.
    vi.mocked(bookingRepository.countOverlapping)
      .mockResolvedValueOnce(1) // +15 min — still full
      .mockResolvedValueOnce(1) // +30 min — still full
      .mockResolvedValueOnce(0); // +45 min — free

    const start = new Date("2026-07-13T10:00:00"); // Monday
    const nearest = await bookingAvailabilityService.findNearestSlot({
      workspaceId: "ws1",
      serviceId: "svc1",
      startAt: start,
    });

    expect(nearest?.toISOString()).toBe(new Date("2026-07-13T10:45:00").toISOString());
    expect(bookingRepository.countOverlapping).toHaveBeenCalledTimes(3);
  });

  it("returns null when nothing is free in the 14-day horizon", async () => {
    const { bookingRepository } = await import("@/lib/repositories/booking.repository");
    const { bookingAvailabilityService } = await import("./booking-availability.service");

    vi.mocked(bookingRepository.findServiceById).mockResolvedValue({ durationMin: 30 } as never);
    vi.mocked(bookingRepository.findResourceById).mockResolvedValue(null as never);
    vi.mocked(bookingRepository.findWorkspaceHours).mockResolvedValue({
      defaultWorkingHours: {} as WorkingHours, // no day ever open
    } as never);
    vi.mocked(bookingRepository.countOverlapping).mockResolvedValue(0);

    const nearest = await bookingAvailabilityService.findNearestSlot({
      workspaceId: "ws1",
      serviceId: "svc1",
      startAt: new Date("2026-07-13T10:00:00"),
    });

    expect(nearest).toBeNull();
  });
});
