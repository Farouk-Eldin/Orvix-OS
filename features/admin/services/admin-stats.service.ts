// PROPOSAL — target path: features/admin/services/admin-stats.service.ts (replaces existing file)
// Only addition: totalBookings, alongside the existing counts. Their
// "Bookings" dashboard card (Part 1 spec) had nothing to read from
// before this milestone — now it does.

import { prisma } from "@/lib/prisma";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const adminStatsService = {
  async getOverview() {
    const [
      totalWorkspaces,
      activeSubscriptions,
      expiredSubscriptions,
      revenueToday,
      revenueMonth,
      totalMessages,
      totalAiReplies,
      storageUsage,
      suspendedWorkspaces,
      totalBookings,
    ] = await Promise.all([
      prisma.workspace.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.subscription.count({ where: { status: "EXPIRED" } }),
      prisma.paymentLog.aggregate({
        where: { status: "PAID", createdAt: { gte: startOfToday() } },
        _sum: { amount: true },
      }),
      prisma.paymentLog.aggregate({
        where: { status: "PAID", createdAt: { gte: startOfMonth() } },
        _sum: { amount: true },
      }),
      prisma.message.count(),
      prisma.message.count({ where: { aiGenerated: true } }),
      prisma.usage.aggregate({ _sum: { storageUsed: true } }),
      prisma.workspace.count({ where: { suspended: true } }),
      prisma.booking.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
    ]);

    return {
      totalWorkspaces,
      activeSubscriptions,
      expiredSubscriptions,
      suspendedWorkspaces,
      revenueTodayEGP: Number(revenueToday._sum.amount ?? 0),
      revenueMonthEGP: Number(revenueMonth._sum.amount ?? 0),
      totalMessages,
      totalAiReplies,
      totalStorageBytes: storageUsage._sum.storageUsed ?? 0,
      totalBookings,
    };
  },

  async getAiProviderStats() {
    // Real per-provider counts derived from what's actually been sent —
    // no synthetic uptime numbers.
    const providers = await prisma.aIProvider.groupBy({
      by: ["provider", "enabled"],
      _count: { _all: true },
    });
    return providers.map((p) => ({ provider: p.provider, enabled: p.enabled, workspacesUsing: p._count._all }));
  },
};
