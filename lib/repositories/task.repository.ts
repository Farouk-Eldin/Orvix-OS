import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class TaskRepository extends BaseRepository {
  create(data: Prisma.TaskCreateInput) {
    return this.db.task.create({ data });
  }

  listForWorkspace(workspaceId: string, params: { status?: "PENDING" | "DONE" } = {}) {
    return this.db.task.findMany({
      where: { workspaceId, ...(params.status ? { status: params.status } : {}) },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }],
      include: {
        relatedCustomer: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  complete(taskId: string) {
    return this.db.task.update({ where: { id: taskId }, data: { status: "DONE" } });
  }
}

export const taskRepository = new TaskRepository();
