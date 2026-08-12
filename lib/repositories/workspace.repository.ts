// PROPOSAL — target path: lib/repositories/workspace.repository.ts (replaces existing file)
// REQUIRED companion fix for ai-employee-schema-proposal.prisma:
// Workspace.aiEmployee (singular, one-to-one) becomes
// Workspace.aiEmployees (plural array) once AIEmployee.workspaceId
// loses its @unique constraint. Only findWithEssentials touches this —
// everything else in the file is byte-identical to the original.

import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class WorkspaceRepository extends BaseRepository {
  findById(id: string) {
    return this.db.workspace.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.db.workspace.findUnique({ where: { slug } });
  }

  findWithEssentials(id: string) {
    return this.db.workspace.findUnique({
      where: { id },
      include: {
        subscription: true,
        // Was `aiEmployee: true`. Fetches just the default employee as
        // a 0-1 array — every existing caller wants "the" AI employee
        // for the workspace, not the full roster, so this keeps the
        // query itself cheap rather than pulling every employee here.
        aiEmployees: { where: { isDefault: true }, take: 1 },
        whatsappAccount: true,
        facebookPage: true,
        instagramAccount: true,
      },
    });
  }

  create(data: Prisma.WorkspaceCreateInput) {
    return this.db.workspace.create({ data });
  }

  update(id: string, data: Prisma.WorkspaceUpdateInput) {
    return this.db.workspace.update({ where: { id }, data });
  }

  async isSlugTaken(slug: string) {
    const existing = await this.db.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });
    return existing !== null;
  }
}

export const workspaceRepository = new WorkspaceRepository();
