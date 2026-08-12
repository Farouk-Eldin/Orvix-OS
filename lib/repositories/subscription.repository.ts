import { BaseRepository } from "@/lib/repositories/base.repository";
import { siteConfig } from "@/config/site";

// PROPOSAL — target path: lib/repositories/subscription.repository.ts (replaces existing file)
// Additions: createReferralTrial, and hasRemainingMessages now checks
// trialEndsAt first (referral trial, date-based) before falling back to
// the original messagesUsed/messagesLimit check (standard trial,
// count-based). Every existing call site keeps working unchanged —
// same method name, same signature, just a smarter body.

export class SubscriptionRepository extends BaseRepository {
  findByWorkspaceId(workspaceId: string) {
    return this.db.subscription.findUnique({ where: { workspaceId } });
  }

  /** Every new workspace gets exactly 10 free AI messages, per spec. */
  createFreeTrial(workspaceId: string) {
    return this.db.subscription.create({
      data: {
        workspaceId,
        plan: "FREE",
        status: "TRIALING",
        messagesLimit: siteConfig.freeTrial.messages,
        messagesUsed: 0,
      },
    });
  }

  // NEW — 30-day unlimited trial for referred signups. messagesLimit
  // stays at the default; it's simply never the thing that gates a
  // referral-trial workspace (see hasRemainingMessages below).
  createReferralTrial(workspaceId: string, trialDays = 30) {
    return this.db.subscription.create({
      data: {
        workspaceId,
        plan: "FREE",
        status: "TRIALING",
        trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
      },
    });
  }

  async incrementMessagesUsed(workspaceId: string) {
    return this.db.subscription.update({
      where: { workspaceId },
      data: { messagesUsed: { increment: 1 } },
    });
  }

  /**
   * The single source of truth for "can this workspace still get an AI reply?"
   * Referral trials (trialEndsAt set) are date-gated and unlimited on
   * messages. Standard trials fall back to the original message-count check.
   */
  async hasRemainingMessages(workspaceId: string) {
    const subscription = await this.findByWorkspaceId(workspaceId);
    if (!subscription) return false;
    if (subscription.status === "ACTIVE") return true;

    if (subscription.trialEndsAt) {
      return subscription.trialEndsAt > new Date();
    }

    return subscription.messagesUsed < subscription.messagesLimit;
  }

  // NEW — for the admin dashboard's trial-status column, and for a
  // future scheduled job to bulk-flip status to EXPIRED. Read-only on
  // purpose; hasRemainingMessages above is what actually gates replies,
  // so this never needs to be perfectly in sync in real time.
  async isTrialExpired(workspaceId: string) {
    const subscription = await this.findByWorkspaceId(workspaceId);
    if (!subscription || subscription.status !== "TRIALING") return false;
    if (subscription.trialEndsAt) return subscription.trialEndsAt <= new Date();
    return subscription.messagesUsed >= subscription.messagesLimit;
  }

  activate(workspaceId: string, renewAt: Date) {
    return this.db.subscription.update({
      where: { workspaceId },
      data: { plan: "PRO", status: "ACTIVE", renewAt },
    });
  }

  markExpired(workspaceId: string) {
    return this.db.subscription.update({
      where: { workspaceId },
      data: { status: "EXPIRED" },
    });
  }
}

export const subscriptionRepository = new SubscriptionRepository();
