import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class AuditLogRepository extends BaseRepository {
  async listForAdmin(params: {
    workspaceId?: string;
    userId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;

    const where: Prisma.AuditLogWhereInput = {
      ...(params.workspaceId ? { workspaceId: params.workspaceId } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.search ? { action: { contains: params.search, mode: "insensitive" } } : {}),
    };

    const [logs, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          workspace: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.db.auditLog.count({ where }),
    ]);

    return { logs, total, page, pageSize };
  }
}

export const auditLogRepository = new AuditLogRepository();
