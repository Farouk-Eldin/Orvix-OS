// PROPOSAL — target path: features/billing/services/credits.service.ts (new file)

import { prisma } from "@/lib/prisma";

export const creditsService = {
  async getBalance(workspaceId: string): Promise<number> {
    const result = await prisma.creditTransaction.aggregate({
      where: { workspaceId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  },

  grant(workspaceId: string, amount: number, reason: "REFERRAL_BONUS" | "ADMIN_GRANT" | "LOYALTY_MILESTONE", note?: string) {
    if (amount <= 0) throw new Error("مبلغ المنحة لازم يكون موجب");
    return prisma.creditTransaction.create({ data: { workspaceId, amount, reason, note } });
  },

  // Balance check + insert happen inside one transaction so two
  // concurrent spends can't both pass a balance check that was only
  // true before either of them committed.
  async spend(workspaceId: string, amount: number, reason: "AI_MESSAGE_SPEND" | "EXTRA_STORAGE_SPEND", note?: string) {
    if (amount <= 0) throw new Error("مبلغ الصرف لازم يكون موجب");

    return prisma.$transaction(async (tx) => {
      const result = await tx.creditTransaction.aggregate({ where: { workspaceId }, _sum: { amount: true } });
      const balance = result._sum.amount ?? 0;

      if (balance < amount) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      return tx.creditTransaction.create({ data: { workspaceId, amount: -amount, reason, note } });
    });
  },

  history(workspaceId: string, limit = 50) {
    return prisma.creditTransaction.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
