import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class BranchRepository extends BaseRepository {
  create(data: Prisma.BranchCreateInput) {
    return this.db.branch.create({ data });
  }

  listForWorkspace(workspaceId: string) {
    return this.db.branch.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { resources: true } } },
    });
  }

  findByIdInWorkspace(id: string, workspaceId: string) {
    return this.db.branch.findFirst({ where: { id, workspaceId } });
  }

  update(id: string, data: Prisma.BranchUpdateInput) {
    return this.db.branch.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.db.branch.delete({ where: { id } });
  }
}

export const branchRepository = new BranchRepository();
