import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma, WithdrawalStatus } from "@prisma/client";

export class WithdrawalRepository extends BaseRepository {
  create(data: Prisma.WithdrawalCreateInput) {
    return this.db.withdrawal.create({ data });
  }

  listForMarketer(marketerId: string) {
    return this.db.withdrawal.findMany({ where: { marketerId }, orderBy: { requestedAt: "desc" } });
  }

  listForAdmin(status?: WithdrawalStatus) {
    return this.db.withdrawal.findMany({
      where: status ? { status } : {},
      orderBy: { requestedAt: "desc" },
      include: { marketer: { select: { id: true, name: true, email: true } } },
    });
  }

  findById(id: string) {
    return this.db.withdrawal.findUnique({ where: { id } });
  }

  setStatus(id: string, status: WithdrawalStatus, adminNote?: string) {
    return this.db.withdrawal.update({
      where: { id },
      data: { status, adminNote, processedAt: status === "PENDING" ? null : new Date() },
    });
  }

  sumPaidOrApproved(marketerId: string) {
    return this.db.withdrawal.aggregate({
      where: { marketerId, status: { in: ["APPROVED", "PAID"] } },
      _sum: { amount: true },
    });
  }
}

export const withdrawalRepository = new WithdrawalRepository();
