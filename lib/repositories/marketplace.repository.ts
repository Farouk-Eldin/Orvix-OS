// PROPOSAL — target path: lib/repositories/marketplace.repository.ts (new file)

import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class MarketplaceRepository extends BaseRepository {
  listPublished(type?: string) {
    return this.db.marketplaceApp.findMany({
      where: { isPublished: true, ...(type ? { type: type as never } : {}) },
      include: { versions: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });
  }

  listForDeveloper(developerWorkspaceId: string) {
    return this.db.marketplaceApp.findMany({
      where: { developerWorkspaceId },
      include: { versions: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    });
  }

  findAppById(appId: string) {
    return this.db.marketplaceApp.findUnique({ where: { id: appId } });
  }

  createApp(data: Prisma.MarketplaceAppCreateInput) {
    return this.db.marketplaceApp.create({ data });
  }

  latestApprovedVersion(appId: string) {
    return this.db.marketplaceAppVersion.findFirst({
      where: { appId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
    });
  }

  createVersion(data: Prisma.MarketplaceAppVersionCreateInput) {
    return this.db.marketplaceAppVersion.create({ data });
  }

  listPendingReview() {
    return this.db.marketplaceAppVersion.findMany({
      where: { status: "PENDING_REVIEW" },
      include: { app: true },
      orderBy: { submittedAt: "asc" }, // oldest submission first — a real review queue, not last-in-first-out
    });
  }

  findVersionById(versionId: string) {
    return this.db.marketplaceAppVersion.findUnique({ where: { id: versionId }, include: { app: true } });
  }

  async decideVersion(versionId: string, decision: "APPROVED" | "REJECTED", reviewerId: string, notes?: string) {
    return this.db.$transaction(async (tx) => {
      const version = await tx.marketplaceAppVersion.update({
        where: { id: versionId },
        data: { status: decision, reviewedAt: new Date(), reviewedByUserId: reviewerId, reviewNotes: notes },
      });

      if (decision === "APPROVED") {
        await tx.marketplaceApp.update({ where: { id: version.appId }, data: { isPublished: true } });
      }

      return version;
    });
  }

  upsertInstall(data: { appId: string; versionId: string; workspaceId: string }) {
    return this.db.marketplaceInstall.upsert({
      where: { appId_workspaceId: { appId: data.appId, workspaceId: data.workspaceId } },
      create: data,
      update: { versionId: data.versionId, uninstalledAt: null },
    });
  }

  listInstalledForWorkspace(workspaceId: string) {
    return this.db.marketplaceInstall.findMany({
      where: { workspaceId, uninstalledAt: null },
      include: { app: true, version: true },
    });
  }
}

export const marketplaceRepository = new MarketplaceRepository();
