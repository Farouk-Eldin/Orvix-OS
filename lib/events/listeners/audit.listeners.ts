// PROPOSAL — target path: lib/events/listeners/audit.listeners.ts (replaces existing file)
// Only the two new eventBus.onEvent blocks at the bottom are additions.

import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/events/event-bus";

export function registerAuditListeners() {
  eventBus.onEvent("WorkspaceCreated", async ({ workspaceId, ownerId, businessType }) => {
    await prisma.auditLog.create({
      data: {
        workspaceId,
        userId: ownerId,
        action: `workspace.created (${businessType})`,
      },
    });
  });

  eventBus.onEvent("PaymentSucceeded", async ({ workspaceId, amount, transactionId }) => {
    await prisma.auditLog.create({
      data: {
        workspaceId,
        action: `payment.succeeded amount=${amount} EGP transaction=${transactionId}`,
      },
    });
  });

  eventBus.onEvent("AppointmentCreated", async ({ workspaceId, appointmentId }) => {
    await prisma.auditLog.create({
      data: {
        workspaceId,
        action: `appointment.created id=${appointmentId}`,
      },
    });
  });

  eventBus.onEvent("BookingStatusChanged", async ({ workspaceId, bookingId, status }) => {
    await prisma.auditLog.create({
      data: {
        workspaceId,
        action: `booking.status_changed id=${bookingId} status=${status}`,
      },
    });
  });

  eventBus.onEvent("SupportTicketCreated", async ({ workspaceId, ticketId, createdByUserId }) => {
    await prisma.auditLog.create({
      data: { workspaceId, userId: createdByUserId, action: `support_ticket.created id=${ticketId}` },
    });
  });

  eventBus.onEvent("SupportTicketClosed", async ({ workspaceId, ticketId }) => {
    await prisma.auditLog.create({
      data: { workspaceId, action: `support_ticket.closed id=${ticketId}` },
    });
  });
}
