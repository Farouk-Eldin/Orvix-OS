import { BaseRepository } from "@/lib/repositories/base.repository";
import type { FeatureRequestStatus, Prisma } from "@prisma/client";

export class FeatureRequestRepository extends BaseRepository {
  create(data: Prisma.FeatureRequestCreateInput) {
    return this.db.featureRequest.create({ data });
  }

  listAll() {
    return this.db.featureRequest.findMany({
      include: { _count: { select: { votes: true } }, submittedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  listVotesForWorkspace(workspaceId: string) {
    return this.db.featureRequestVote.findMany({ where: { workspaceId }, select: { featureRequestId: true } });
  }

  addVote(featureRequestId: string, workspaceId: string) {
    return this.db.featureRequestVote.create({ data: { featureRequestId, workspaceId } });
  }

  removeVote(featureRequestId: string, workspaceId: string) {
    return this.db.featureRequestVote
      .delete({ where: { featureRequestId_workspaceId: { featureRequestId, workspaceId } } })
      .catch(() => null);
  }

  setStatus(id: string, status: FeatureRequestStatus) {
    return this.db.featureRequest.update({ where: { id }, data: { status } });
  }
}

export const featureRequestRepository = new FeatureRequestRepository();
