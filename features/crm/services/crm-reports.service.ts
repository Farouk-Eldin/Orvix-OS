import { prisma } from "@/lib/prisma";

export const crmReportsService = {
  async getOverview(workspaceId: string, periodDays: number = 30) {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

    const [
      newCustomers,
      totalCustomers,
      returningCustomers,
      lostCustomers,
      bookingsInPeriod,
      completedBookings,
      totalLeads,
      convertedLeads,
      customersWithBookings,
    ] = await Promise.all([
      prisma.customer.count({ where: { workspaceId, createdAt: { gte: since } } }),
      prisma.customer.count({ where: { workspaceId } }),
      // "Returning" = existed before the window, but had activity inside it.
      prisma.customer.count({
        where: {
          workspaceId,
          createdAt: { lt: since },
          conversations: { some: { lastMessageAt: { gte: since } } },
        },
      }),
      prisma.customer.count({ where: { workspaceId, status: "INACTIVE" } }),
      prisma.booking.count({ where: { workspaceId, createdAt: { gte: since } } }),
      prisma.booking.findMany({
        where: { workspaceId, status: "COMPLETED", createdAt: { gte: since } },
        select: { service: { select: { price: true } } },
      }),
      prisma.lead.count({ where: { workspaceId } }),
      prisma.lead.count({ where: { workspaceId, stage: "WON" } }),
      prisma.customer.count({ where: { workspaceId, bookings: { some: {} } } }),
    ]);

    // The business's own revenue from its own services — separate from
    // (and unrelated to) Orvix's own subscription revenue from this
    // workspace, which lives in the admin panel, not here.
    const revenue = completedBookings.reduce((sum, b) => sum + Number(b.service.price ?? 0), 0);

    return {
      periodDays,
      newCustomers,
      returningCustomers,
      lostCustomers,
      totalCustomers,
      bookingsInPeriod,
      revenue,
      leadConversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
      bookingConversionRate: totalCustomers > 0 ? Math.round((customersWithBookings / totalCustomers) * 100) : 0,
      totalLeads,
      convertedLeads,
    };
  },
};
