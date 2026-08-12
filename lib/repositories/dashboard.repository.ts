import { BaseRepository } from "@/lib/repositories/base.repository";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export class DashboardRepository extends BaseRepository {
  async getSummary(workspaceId: string) {
    const [customersCount, messagesCount, messagesToday, aiRepliesCount, filesCount, faqsCount] =
      await Promise.all([
        this.db.customer.count({ where: { workspaceId } }),
        this.db.message.count({ where: { conversation: { workspaceId } } }),
        this.db.message.count({
          where: { conversation: { workspaceId }, createdAt: { gte: startOfToday() } },
        }),
        this.db.message.count({ where: { conversation: { workspaceId }, aiGenerated: true } }),
        this.db.knowledgeFile.count({ where: { knowledgeBase: { workspaceId } } }),
        this.db.knowledgeFAQ.count({ where: { knowledgeBase: { workspaceId } } }),
      ]);

    return { customersCount, messagesCount, messagesToday, aiRepliesCount, filesCount, faqsCount };
  }

  /** Daily rollups for the last N days, zero-filled for days with no Analytics row yet. */
  async getMessagesTimeSeries(workspaceId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const rows = await this.db.analytics.findMany({
      where: { workspaceId, date: { gte: since } },
      orderBy: { date: "asc" },
    });

    const byDate = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), r]));
    const series: Array<{ date: string; messages: number; aiReplies: number; knowledgeHits: number }> = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const row = byDate.get(key);
      series.push({
        date: key,
        messages: row?.messages ?? 0,
        aiReplies: row?.aiReplies ?? 0,
        knowledgeHits: row?.knowledgeHits ?? 0,
      });
    }

    return series;
  }

  async getChannelDistribution(workspaceId: string) {
    const rows = await this.db.conversation.groupBy({
      by: ["channel"],
      where: { workspaceId },
      _count: { _all: true },
    });
    return rows.map((r) => ({ channel: r.channel, count: r._count._all }));
  }

  async getConfidenceDistribution(workspaceId: string) {
    const rows = await this.db.message.groupBy({
      by: ["confidenceScore"],
      where: { conversation: { workspaceId }, aiGenerated: true, confidenceScore: { not: null } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ confidence: r.confidenceScore, count: r._count._all }));
  }

  async getAverageResponseTimeMs(workspaceId: string) {
    const result = await this.db.message.aggregate({
      where: { conversation: { workspaceId }, aiGenerated: true, responseTimeMs: { not: null } },
      _avg: { responseTimeMs: true },
    });
    return Math.round(result._avg.responseTimeMs ?? 0);
  }

  getRecentConversations(workspaceId: string, take = 5) {
    return this.db.conversation.findMany({
      where: { workspaceId },
      orderBy: { lastMessageAt: "desc" },
      take,
      include: {
        customer: { select: { name: true, phone: true, avatar: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  getRecentCustomers(workspaceId: string, take = 5) {
    return this.db.customer.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}

export const dashboardRepository = new DashboardRepository();
