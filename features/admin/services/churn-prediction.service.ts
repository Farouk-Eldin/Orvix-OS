// PROPOSAL — target path: features/admin/services/churn-prediction.service.ts (new file)
//
// Every signal below reads a field confirmed to actually exist in
// schema.prisma before writing this — no lastLoginAt/lastActiveAt was
// invented; "last activity" is genuinely derived from
// Conversation.lastMessageAt, the real signal already used elsewhere
// in this codebase (conversationRepository.touch).

import { prisma } from "@/lib/prisma";

export type ChurnRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface ChurnSignal {
  key: string;
  triggered: boolean;
  weight: number;
  detail: string;
}

export interface ChurnScore {
  workspaceId: string;
  score: number; // 0-100, higher = more likely to churn
  level: ChurnRiskLevel;
  signals: ChurnSignal[];
}

const INACTIVITY_DAYS_THRESHOLD = 14;

function levelFromScore(score: number): ChurnRiskLevel {
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

export const churnPredictionService = {
  async scoreWorkspace(workspaceId: string): Promise<ChurnScore> {
    const [subscription, lastConversation, recentFailedPayment, workspace] = await Promise.all([
      prisma.subscription.findUnique({ where: { workspaceId } }),
      prisma.conversation.findFirst({
        where: { workspaceId },
        orderBy: { lastMessageAt: "desc" },
        select: { lastMessageAt: true },
      }),
      prisma.paymentLog.findFirst({
        where: { workspaceId, status: "FAILED", createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { suspended: true } }),
    ]);

    const daysSinceLastMessage = lastConversation?.lastMessageAt
      ? Math.floor((Date.now() - lastConversation.lastMessageAt.getTime()) / (24 * 60 * 60 * 1000))
      : null;

    const signals: ChurnSignal[] = [
      {
        key: "NO_ACTIVITY",
        triggered: daysSinceLastMessage === null || daysSinceLastMessage >= INACTIVITY_DAYS_THRESHOLD,
        weight: 35,
        detail:
          daysSinceLastMessage === null
            ? "لا توجد أي محادثة مسجّلة"
            : `آخر رسالة من ${daysSinceLastMessage} يوم`,
      },
      {
        key: "TRIAL_NEARLY_EXPIRED",
        triggered:
          subscription?.status === "TRIALING" &&
          !subscription.trialEndsAt &&
          subscription.messagesUsed >= subscription.messagesLimit * 0.8,
        weight: 20,
        detail: "استخدم أغلب رسائل التجربة المجانية ولسه ما اشتركش",
      },
      {
        key: "PAYMENT_FAILED_RECENTLY",
        triggered: !!recentFailedPayment,
        weight: 25,
        detail: recentFailedPayment ? "فشلت محاولة دفع خلال آخر ٣٠ يوم" : "",
      },
      {
        key: "SUSPENDED",
        triggered: !!workspace?.suspended,
        weight: 20,
        detail: "الحساب موقوف حاليًا",
      },
    ];

    const score = Math.min(
      100,
      signals.filter((s) => s.triggered).reduce((sum, s) => sum + s.weight, 0)
    );

    return { workspaceId, score, level: levelFromScore(score), signals };
  },

  // For the admin dashboard's at-risk list — active/trialing workspaces
  // only, since a workspace already EXPIRED or on a stable ACTIVE plan
  // with no red flags isn't what "at risk of churning soon" means.
  async listAtRisk(limit = 50) {
    const candidates = await prisma.workspace.findMany({
      where: { subscription: { status: { in: ["ACTIVE", "TRIALING"] } } },
      select: { id: true, name: true },
      take: 200, // scored in application code below; capped so this stays cheap
    });

    const scored = await Promise.all(candidates.map((w) => this.scoreWorkspace(w.id)));

    return scored
      .filter((s) => s.level !== "LOW")
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => ({ ...s, workspaceName: candidates.find((c) => c.id === s.workspaceId)?.name }));
  },
};
