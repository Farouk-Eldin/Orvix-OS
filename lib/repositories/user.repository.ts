import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class UserRepository extends BaseRepository {
  findByClerkId(clerkId: string) {
    return this.db.user.findUnique({ where: { clerkId } });
  }

  findById(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  create(data: Prisma.UserCreateInput) {
    return this.db.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.db.user.update({ where: { id }, data });
  }

  /** Called once onboarding creates the workspace — links the user and sets their role. */
  attachToWorkspace(userId: string, workspaceId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { workspaceId, role: "OWNER" },
    });
  }

  delete(clerkId: string) {
    return this.db.user.delete({ where: { clerkId } });
  }

  findOwner(workspaceId: string) {
    return this.db.user.findFirst({ where: { workspaceId, role: "OWNER" } });
  }
}

export const userRepository = new UserRepository();
