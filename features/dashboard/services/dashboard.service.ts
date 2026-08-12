// PROPOSAL — target path: features/dashboard/services/dashboard.service.ts (replaces existing file)
// REQUIRED companion fix for the AIEmployee[] schema change. Only
// getSummary's aiEmployee line changed — it now reads
// workspace.aiEmployees[0] internally, but the object THIS function
// returns still has a singular "aiEmployee" key, unchanged shape. That
// means system-health-card.tsx, which consumes this return value (not
// the Prisma relation directly), needs no changes at all.

import { dashboardRepository } from "@/lib/repositories/dashboard.repository";
import { workspaceRepository } from "@/lib/repositories/workspace.repository";
import { subscriptionRepository } from "@/lib/repositories/subscription.repository";
import { prisma } from "@/lib/prisma";

export const dashboardService = {
  async getSummary(workspaceId: string) {
    const [summary, workspace, subscription, aiProvider, knowledgeBase, avgResponseTime] = await Promise.all([
      dashboardRepository.getSummary(workspaceId),
      workspaceRepository.findWithEssentials(workspaceId),
      subscriptionRepository.findByWorkspaceId(workspaceId),
      prisma.aIProvider.findFirst({ where: { workspaceId, enabled: true } }),
      prisma.knowledgeBase.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
      prisma.analytics.aggregate({ where: { workspaceId }, _avg: { responseTime: true } }),
    ]);

    const defaultEmployee = workspace?.aiEmployees?.[0];

    return {
      ...summary,
      channels: {
        whatsapp: workspace?.whatsappAccount?.status ?? "DISCONNECTED",
        facebook: workspace?.facebookPage?.status ?? "DISCONNECTED",
        instagram: workspace?.instagramAccount?.status ?? "DISCONNECTED",
      },
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            messagesUsed: subscription.messagesUsed,
            messagesLimit: subscription.messagesLimit,
            renewAt: subscription.renewAt,
          }
        : null,
      aiEmployee: defaultEmployee ? { name: defaultEmployee.name, personality: defaultEmployee.personality } : null,
      aiProvider: aiProvider ? { provider: aiProvider.provider, model: aiProvider.defaultModel } : null,
      knowledgeBaseStatus: knowledgeBase?.status ?? "EMPTY",
      avgResponseTimeMs: avgResponseTime._avg.responseTime ?? null,
    };
  },

  async getAnalytics(workspaceId: string, days = 14) {
    return dashboardRepository.getMessagesTimeSeries(workspaceId, days);
  },

  async getFullAnalytics(workspaceId: string, days = 14) {
    const [timeSeries, channelDistribution, confidenceDistribution, avgResponseTimeMs] = await Promise.all([
      dashboardRepository.getMessagesTimeSeries(workspaceId, days),
      dashboardRepository.getChannelDistribution(workspaceId),
      dashboardRepository.getConfidenceDistribution(workspaceId),
      dashboardRepository.getAverageResponseTimeMs(workspaceId),
    ]);
    return { timeSeries, channelDistribution, confidenceDistribution, avgResponseTimeMs };
  },

  async getRecentActivity(workspaceId: string) {
    const [conversations, customers] = await Promise.all([
      dashboardRepository.getRecentConversations(workspaceId),
      dashboardRepository.getRecentCustomers(workspaceId),
    ]);
    return { conversations, customers };
  },
};
