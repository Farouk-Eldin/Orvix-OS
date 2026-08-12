import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

// PROPOSAL — target path: lib/repositories/customer.repository.ts (replaces existing file)
// Everything above searchForWorkspace() is byte-identical to your
// existing file. listForWorkspace() is untouched (its signature is
// probably called elsewhere) — new methods added instead of changing it.

export class CustomerRepository extends BaseRepository {
  findByPhone(workspaceId: string, phone: string) {
    return this.db.customer.findFirst({ where: { workspaceId, phone } });
  }

  findByFacebookId(workspaceId: string, facebookId: string) {
    return this.db.customer.findFirst({ where: { workspaceId, facebookId } });
  }

  findByInstagramId(workspaceId: string, instagramId: string) {
    return this.db.customer.findFirst({ where: { workspaceId, instagramId } });
  }

  create(data: Prisma.CustomerCreateInput) {
    return this.db.customer.create({ data });
  }

  update(id: string, data: Prisma.CustomerUpdateInput) {
    return this.db.customer.update({ where: { id }, data });
  }

  listForWorkspace(workspaceId: string, limit = 20) {
    return this.db.customer.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /** No cap on purpose — listForWorkspace's default limit=20 exists for dashboard pages, not exports. */
  listAllForExport(workspaceId: string) {
    return this.db.customer.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" } });
  }

  countForWorkspace(workspaceId: string) {
    return this.db.customer.count({ where: { workspaceId } });
  }

  // ---- NEW below this line — CRM milestone ----

  async searchForWorkspace(params: { workspaceId: string; search?: string; status?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.CustomerWhereInput = {
      workspaceId: params.workspaceId,
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { phone: { contains: params.search } },
              { email: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [customers, total] = await Promise.all([
      this.db.customer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.db.customer.count({ where }),
    ]);

    return { customers, total, page, pageSize };
  }

  findByIdInWorkspace(customerId: string, workspaceId: string) {
    return this.db.customer.findFirst({
      where: { id: customerId, workspaceId },
      include: { assignedUser: { select: { id: true, name: true } } },
    });
  }

  // Timeline sources are read from tables that already exist per-customer
  // (Conversation, Booking) plus the new CustomerNote — nothing here
  // writes a parallel "activity log", it's assembled on read.
  async getTimeline(customerId: string) {
    const [conversations, bookings, notes] = await Promise.all([
      this.db.conversation.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        select: { id: true, channel: true, status: true, createdAt: true, lastMessageAt: true },
      }),
      this.db.booking.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        include: { service: { select: { name: true } } },
      }),
      this.db.customerNote.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { conversations, bookings, notes };
  }
  createNote(data: Prisma.CustomerNoteCreateInput) {
    return this.db.customerNote.create({ data });
  }

  deleteNote(noteId: string) {
    return this.db.customerNote.delete({ where: { id: noteId } });
  }

  togglePinNote(noteId: string, pinned: boolean) {
    return this.db.customerNote.update({ where: { id: noteId }, data: { pinned } });
  }
}

export const customerRepository = new CustomerRepository();
