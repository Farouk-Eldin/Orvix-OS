import { supportTicketRepository } from "@/lib/repositories/support-ticket.repository";
import { eventBus } from "@/lib/events/event-bus";
import type { TicketPriority, TicketStatus } from "@prisma/client";

export class TicketNotFoundError extends Error {}

export const supportTicketService = {
  async createTicket(params: {
    workspaceId: string;
    userId: string;
    subject: string;
    body: string;
    category?: string;
    priority?: TicketPriority;
  }) {
    const ticket = await supportTicketRepository.create({
      workspace: { connect: { id: params.workspaceId } },
      createdBy: { connect: { id: params.userId } },
      subject: params.subject,
      category: params.category,
      priority: params.priority ?? "MEDIUM",
      messages: {
        create: { body: params.body, author: { connect: { id: params.userId } } },
      },
    });

    eventBus.emitEvent("SupportTicketCreated", {
      workspaceId: params.workspaceId,
      ticketId: ticket.id,
      subject: ticket.subject,
      createdByUserId: params.userId,
    });

    return ticket;
  },

  async getForWorkspace(ticketId: string, workspaceId: string) {
    const ticket = await supportTicketRepository.findByIdInWorkspace(ticketId, workspaceId);
    if (!ticket) throw new TicketNotFoundError();
    return ticket;
  },

  listForWorkspace(workspaceId: string) {
    return supportTicketRepository.listForWorkspace(workspaceId);
  },

  /**
   * A workspace member replying keeps the conversation moving; if the
   * ticket had already been marked CLOSED, a new reply means it wasn't
   * actually resolved, so it reopens automatically rather than silently
   * dropping the message on a dead thread.
   */
  async replyAsWorkspace(params: { ticketId: string; workspaceId: string; userId: string; body: string }) {
    const ticket = await supportTicketRepository.findByIdInWorkspace(params.ticketId, params.workspaceId);
    if (!ticket) throw new TicketNotFoundError();

    if (ticket.status === "CLOSED") {
      await supportTicketRepository.updateStatus(params.ticketId, "OPEN");
    }

    const message = await supportTicketRepository.addMessage({
      ticket: { connect: { id: params.ticketId } },
      author: { connect: { id: params.userId } },
      body: params.body,
    });
    await supportTicketRepository.touch(params.ticketId);

    eventBus.emitEvent("SupportTicketReplied", {
      workspaceId: params.workspaceId,
      ticketId: params.ticketId,
      authorUserId: params.userId,
      isAdminReply: false,
    });

    return message;
  },

  async closeAsWorkspace(params: { ticketId: string; workspaceId: string }) {
    const ticket = await supportTicketRepository.findByIdInWorkspace(params.ticketId, params.workspaceId);
    if (!ticket) throw new TicketNotFoundError();
    const closed = await supportTicketRepository.updateStatus(params.ticketId, "CLOSED");
    eventBus.emitEvent("SupportTicketClosed", { workspaceId: params.workspaceId, ticketId: params.ticketId });
    return closed;
  },

  async getForAdmin(ticketId: string) {
    const ticket = await supportTicketRepository.findByIdForAdmin(ticketId);
    if (!ticket) throw new TicketNotFoundError();
    return ticket;
  },

  listForAdmin(params: Parameters<typeof supportTicketRepository.listForAdmin>[0]) {
    return supportTicketRepository.listForAdmin(params);
  },

  /** Internal notes never touch lastMessageAt, never flip status, and never notify the workspace. */
  async replyAsAdmin(params: { ticketId: string; adminUserId: string; body: string; isInternalNote?: boolean }) {
    const ticket = await supportTicketRepository.findByIdForAdmin(params.ticketId);
    if (!ticket) throw new TicketNotFoundError();

    const message = await supportTicketRepository.addMessage({
      ticket: { connect: { id: params.ticketId } },
      author: { connect: { id: params.adminUserId } },
      body: params.body,
      isInternalNote: params.isInternalNote ?? false,
    });

    if (!params.isInternalNote) {
      await supportTicketRepository.touch(params.ticketId);
      if (ticket.status === "OPEN") {
        await supportTicketRepository.updateStatus(params.ticketId, "IN_PROGRESS");
      }
      eventBus.emitEvent("SupportTicketReplied", {
        workspaceId: ticket.workspaceId,
        ticketId: params.ticketId,
        authorUserId: params.adminUserId,
        isAdminReply: true,
      });
    }

    return message;
  },

  async assign(ticketId: string, adminUserId: string | null) {
    return supportTicketRepository.assign(ticketId, adminUserId);
  },

  async setStatus(ticketId: string, status: TicketStatus) {
    const ticket = await supportTicketRepository.updateStatus(ticketId, status);
    if (status === "CLOSED") {
      eventBus.emitEvent("SupportTicketClosed", { workspaceId: ticket.workspaceId, ticketId: ticket.id });
    }
    return ticket;
  },

  async setPriority(ticketId: string, priority: TicketPriority) {
    return supportTicketRepository.updatePriority(ticketId, priority);
  },
};
