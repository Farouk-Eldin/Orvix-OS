import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma, TicketStatus, TicketPriority } from "@prisma/client";

export class SupportTicketRepository extends BaseRepository {
  create(data: Prisma.SupportTicketCreateInput) {
    return this.db.supportTicket.create({ data });
  }

  /** Workspace-side read — internal admin notes are never included here. */
  findByIdInWorkspace(id: string, workspaceId: string) {
    return this.db.supportTicket.findFirst({
      where: { id, workspaceId },
      include: {
        messages: {
          where: { isInternalNote: false },
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, avatar: true, isSuperAdmin: true } } },
        },
      },
    });
  }

  /** Admin read — includes internal notes and cross-workspace context. */
  findByIdForAdmin(id: string) {
    return this.db.supportTicket.findUnique({
      where: { id },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true, avatar: true } },
        assignedAdmin: { select: { id: true, name: true, avatar: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, avatar: true, isSuperAdmin: true } } },
        },
      },
    });
  }

  listForWorkspace(workspaceId: string) {
    return this.db.supportTicket.findMany({
      where: { workspaceId },
      orderBy: { lastMessageAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
  }

  async listForAdmin(params: {
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedAdminId?: string | "unassigned";
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.SupportTicketWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(params.assignedAdminId === "unassigned"
        ? { assignedAdminId: null }
        : params.assignedAdminId
          ? { assignedAdminId: params.assignedAdminId }
          : {}),
      ...(params.search
        ? {
            OR: [
              { subject: { contains: params.search, mode: "insensitive" } },
              { workspace: { name: { contains: params.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [tickets, total] = await Promise.all([
      this.db.supportTicket.findMany({
        where,
        orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          workspace: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          assignedAdmin: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.db.supportTicket.count({ where }),
    ]);

    return { tickets, total, page, pageSize };
  }

  addMessage(data: Prisma.SupportTicketMessageCreateInput) {
    return this.db.supportTicketMessage.create({
      data,
      include: { author: { select: { id: true, name: true, avatar: true, isSuperAdmin: true } } },
    });
  }

  touch(ticketId: string) {
    return this.db.supportTicket.update({ where: { id: ticketId }, data: { lastMessageAt: new Date() } });
  }

  updateStatus(ticketId: string, status: TicketStatus) {
    return this.db.supportTicket.update({
      where: { id: ticketId },
      data: { status, closedAt: status === "CLOSED" ? new Date() : null },
    });
  }

  assign(ticketId: string, assignedAdminId: string | null) {
    return this.db.supportTicket.update({ where: { id: ticketId }, data: { assignedAdminId } });
  }

  updatePriority(ticketId: string, priority: TicketPriority) {
    return this.db.supportTicket.update({ where: { id: ticketId }, data: { priority } });
  }

  /** Powers the admin dashboard's "open tickets" card. */
  countOpenForAdmin() {
    return this.db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });
  }

  countByStatusForAdmin() {
    return this.db.supportTicket.groupBy({ by: ["status"], _count: { _all: true } });
  }
}

export const supportTicketRepository = new SupportTicketRepository();
