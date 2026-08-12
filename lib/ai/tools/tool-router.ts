import { prisma } from "@/lib/prisma";
import { featureRepository } from "@/lib/repositories/feature.repository";
import { bookingAvailabilityService } from "@/features/booking/services/booking-availability.service";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { taskRepository } from "@/lib/repositories/task.repository";
import type { ToolCall } from "@/lib/ai/providers/types";

// AI -> tool call -> this router -> a real service -> database.
// The model never touches Prisma directly.

interface RouterContext {
  workspaceId: string;
  customerId: string;
  channel: string;
}

type ToolOutcome =
  | { ok: true; result: { booked: true; bookingId: string; startAt: Date } }
  | { ok: true; result: Awaited<ReturnType<typeof bookingAvailabilityService.checkAvailability>> }
  | { ok: true; result: { noted: true; noteId: string } }
  | { ok: true; result: { taskCreated: true; taskId: string } }
  | { ok: false; message: string };

const BOOKING_TOOL_NAMES = new Set(["check_availability", "create_booking"]);

export async function executeToolCall(call: ToolCall, ctx: RouterContext): Promise<ToolOutcome> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: ctx.workspaceId },
    select: { suspended: true },
  });
  if (workspace?.suspended) {
    return { ok: false, message: "الحساب متوقف مؤقتًا" };
  }

  // Only the booking tools ride on the "booking" flag — add_customer_note
  // and create_task are CRM/ops actions with no reason to be tied to
  // whether this workspace uses the booking system at all.
  if (BOOKING_TOOL_NAMES.has(call.name)) {
    const bookingEnabled = await featureRepository.isEnabled(ctx.workspaceId, "booking");
    if (!bookingEnabled) {
      return { ok: false, message: "خاصية الحجز متوقفة على هذا الحساب حاليًا" };
    }
  }

  if (call.name === "check_availability") {
    const args = call.arguments as { serviceId: string; resourceId?: string; startAtIso: string };
    const result = await bookingAvailabilityService.checkAvailability({
      workspaceId: ctx.workspaceId,
      serviceId: args.serviceId,
      resourceId: args.resourceId,
      startAt: new Date(args.startAtIso),
    });
    return { ok: true, result };
  }

  if (call.name === "create_booking") {
    const args = call.arguments as { serviceId: string; resourceId?: string; startAtIso: string };
    try {
      const booking = await bookingAvailabilityService.createBooking({
        workspaceId: ctx.workspaceId,
        customerId: ctx.customerId,
        serviceId: args.serviceId,
        resourceId: args.resourceId,
        startAt: new Date(args.startAtIso),
        channel: ctx.channel,
        createdByAI: true,
      });
      return { ok: true, result: { booked: true, bookingId: booking.id, startAt: booking.startAt } };
    } catch {
      return { ok: false, message: "الميعاد ده بقى مش متاح، جرب وقت تاني" };
    }
  }

  if (call.name === "add_customer_note") {
    const args = call.arguments as { note: string };
    const note = await customerRepository.createNote({
      workspace: { connect: { id: ctx.workspaceId } },
      customer: { connect: { id: ctx.customerId } },
      content: args.note,
      createdByAI: true,
    });
    return { ok: true, result: { noted: true, noteId: note.id } };
  }

  if (call.name === "create_task") {
    const args = call.arguments as { title: string; dueAtIso?: string };
    const task = await taskRepository.create({
      workspace: { connect: { id: ctx.workspaceId } },
      title: args.title,
      dueAt: args.dueAtIso ? new Date(args.dueAtIso) : undefined,
      relatedCustomer: { connect: { id: ctx.customerId } },
      createdByAI: true,
    });
    return { ok: true, result: { taskCreated: true, taskId: task.id } };
  }

  return { ok: false, message: `unknown tool: ${call.name}` };
}
