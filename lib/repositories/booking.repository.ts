// PROPOSAL — target path: lib/repositories/booking.repository.ts (new file)
// Follows base.repository.ts's own documented rule:
// "Services -> Repositories -> Prisma -> PostgreSQL"

import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class BookingRepository extends BaseRepository {
  findServiceById(serviceId: string) {
    return this.db.service.findUniqueOrThrow({ where: { id: serviceId } });
  }

  findResourceById(resourceId: string) {
    return this.db.resource.findUnique({ where: { id: resourceId } });
  }

  findWorkspaceHours(workspaceId: string) {
    return this.db.workspace.findUnique({
      where: { id: workspaceId },
      select: { defaultWorkingHours: true },
    });
  }

  countOverlapping(params: { workspaceId: string; resourceId?: string; startAt: Date; endAt: Date }) {
    return this.db.booking.count({
      where: {
        workspaceId: params.workspaceId,
        resourceId: params.resourceId ?? undefined,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lt: params.endAt },
        endAt: { gt: params.startAt },
      },
    });
  }

  create(data: Prisma.BookingCreateInput) {
    return this.db.booking.create({ data });
  }

  update(bookingId: string, data: Prisma.BookingUpdateInput) {
    return this.db.booking.update({ where: { id: bookingId }, data });
  }

  findByIdInWorkspace(bookingId: string, workspaceId: string) {
    return this.db.booking.findFirst({ where: { id: bookingId, workspaceId } });
  }

  findByIdWithDetails(bookingId: string) {
    return this.db.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, customer: true },
    });
  }

  listServices(workspaceId: string) {
    return this.db.service.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
  }

  createService(data: Prisma.ServiceCreateInput) {
    return this.db.service.create({ data });
  }

  listResources(workspaceId: string) {
    return this.db.resource.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });
  }

  createResource(data: Prisma.ResourceCreateInput) {
    return this.db.resource.create({ data });
  }

  async listForWorkspace(params: {
    workspaceId: string;
    status?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.BookingWhereInput = {
      workspaceId: params.workspaceId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            customer: {
              OR: [
                { name: { contains: params.search, mode: "insensitive" } },
                { phone: { contains: params.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const [bookings, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        orderBy: { startAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { customer: true, service: true, resource: true },
      }),
      this.db.booking.count({ where }),
    ]);

    return { bookings, total, page, pageSize };
  }
}

export const bookingRepository = new BookingRepository();
