// PROPOSAL — target path: lib/repositories/team-member.repository.ts (new file)

import { BaseRepository } from "@/lib/repositories/base.repository";

export class TeamMemberRepository extends BaseRepository {
  findMembership(userId: string, workspaceId: string) {
    return this.db.teamMember.findUnique({ where: { workspaceId_userId: { workspaceId, userId } } });
  }

  listWorkspacesForUser(userId: string) {
    return this.db.teamMember.findMany({
      where: { userId },
      include: { workspace: { select: { id: true, name: true, slug: true, logo: true, businessType: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  create(data: { workspaceId: string; userId: string; role: "OWNER" | "ADMIN" | "MEMBER" }) {
    return this.db.teamMember.create({ data });
  }

  listForWorkspace(workspaceId: string) {
    return this.db.teamMember.findMany({
      where: { workspaceId },
      include: { user: { select: { name: true, email: true, avatar: true } } },
      orderBy: { createdAt: "asc" },
    });
  }

  findById(memberId: string) {
    return this.db.teamMember.findUnique({ where: { id: memberId } });
  }

  async updateRole(memberId: string, userId: string, role: "ADMIN" | "MEMBER") {
    const [member] = await this.db.$transaction([
      this.db.teamMember.update({ where: { id: memberId }, data: { role } }),
      this.db.user.update({ where: { id: userId }, data: { role } }),
    ]);
    return member;
  }

  updatePermissions(memberId: string, permissions: string[]) {
    return this.db.teamMember.update({ where: { id: memberId }, data: { permissions } });
  }

  async remove(memberId: string, userId: string) {
    await this.db.$transaction([
      this.db.teamMember.delete({ where: { id: memberId } }),
      this.db.user.update({ where: { id: userId }, data: { workspaceId: null } }),
    ]);
  }
}

export const teamMemberRepository = new TeamMemberRepository();
