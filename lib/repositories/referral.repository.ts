// PROPOSAL — target path: lib/repositories/referral.repository.ts (new file)

import { BaseRepository } from "@/lib/repositories/base.repository";

export class ReferralRepository extends BaseRepository {
  findActiveMarketerByCode(code: string) {
    return this.db.marketer.findFirst({ where: { referralCode: code, status: "ACTIVE" } });
  }

  createReferral(data: { marketerId: string; workspaceId: string; trialEndsAt: Date }) {
    return this.db.referral.create({ data });
  }

  findByWorkspaceId(workspaceId: string) {
    return this.db.referral.findUnique({ where: { workspaceId } });
  }

  markConverted(workspaceId: string) {
    // Only ever touches a row that exists — silently does nothing for
    // organic (non-referred) workspaces, which is the common case.
    return this.db.referral.updateMany({
      where: { workspaceId, convertedAt: null },
      data: { convertedAt: new Date() },
    });
  }

  listMarketersWithStats() {
    return this.db.marketer.findMany({
      include: {
        _count: { select: { referrals: true } },
        referrals: { select: { convertedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  createMarketer(data: { name: string; email: string; phone?: string; referralCode: string }) {
    return this.db.marketer.create({ data });
  }

  findMarketerWithStats(marketerId: string) {
    return this.db.marketer.findUnique({
      where: { id: marketerId },
      include: {
        referrals: { select: { convertedAt: true, workspace: { select: { name: true } }, registeredAt: true } },
      },
    });
  }
}

export const referralRepository = new ReferralRepository();
