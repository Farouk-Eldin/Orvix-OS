import { prisma } from "@/lib/prisma";
import { userRepository } from "@/lib/repositories/user.repository";
import { sendTransactionalEmail } from "@/lib/email/resend-client";
import { emailTemplates } from "@/lib/email/templates";
import type { SubscriptionPlan } from "@prisma/client";

export type BroadcastAudience = "ALL" | "PLAN" | "WORKSPACE";

export const broadcastService = {
  async resolveWorkspaceIds(
    audience: BroadcastAudience,
    params: { plan?: SubscriptionPlan; workspaceId?: string }
  ): Promise<string[]> {
    if (audience === "WORKSPACE") {
      return params.workspaceId ? [params.workspaceId] : [];
    }
    if (audience === "PLAN") {
      if (!params.plan) return [];
      const subs = await prisma.subscription.findMany({ where: { plan: params.plan }, select: { workspaceId: true } });
      return subs.map((s) => s.workspaceId);
    }
    const workspaces = await prisma.workspace.findMany({ select: { id: true } });
    return workspaces.map((w) => w.id);
  },

  async send(params: {
    title: string;
    body: string;
    audience: BroadcastAudience;
    plan?: SubscriptionPlan;
    workspaceId?: string;
    sentByUserId: string;
    sendEmail?: boolean;
  }) {
    const workspaceIds = await this.resolveWorkspaceIds(params.audience, {
      plan: params.plan,
      workspaceId: params.workspaceId,
    });
    if (workspaceIds.length === 0) return { sentCount: 0, emailsSent: 0 };

    // One notification + one audit row per targeted workspace, not a
    // single platform-level log line — that way each workspace's own
    // audit trail genuinely shows it received the broadcast, and nothing
    // needs a nullable workspaceId just for this one feature.
    await prisma.$transaction([
      prisma.notification.createMany({
        data: workspaceIds.map((workspaceId) => ({
          workspaceId,
          title: params.title,
          body: params.body,
          type: "BROADCAST_ANNOUNCEMENT" as const,
        })),
      }),
      prisma.auditLog.createMany({
        data: workspaceIds.map((workspaceId) => ({
          workspaceId,
          userId: params.sentByUserId,
          action: `broadcast.received title="${params.title}" audience=${params.audience}`,
        })),
      }),
    ]);

    let emailsSent = 0;
    if (params.sendEmail) {
      // Sequential, not Promise.all — an admin broadcast to a large
      // audience shouldn't fire hundreds of concurrent requests at
      // Resend at once. This runs from an admin action, not a hot path,
      // so the extra time is an acceptable trade for not tripping a
      // provider rate limit mid-send.
      for (const workspaceId of workspaceIds) {
        const owner = await userRepository.findOwner(workspaceId);
        if (!owner?.email) continue;
        try {
          await sendTransactionalEmail({
            workspaceId,
            to: owner.email,
            subject: params.title,
            html: emailTemplates.broadcastAnnouncement(params.title, params.body),
            type: "BROADCAST_ANNOUNCEMENT",
          });
          emailsSent += 1;
        } catch (error) {
          console.error(`[broadcast] email failed for workspace ${workspaceId}:`, error);
        }
      }
    }

    return { sentCount: workspaceIds.length, emailsSent };
  },
};
