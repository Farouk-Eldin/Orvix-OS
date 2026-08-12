// PROPOSAL — target path: features/admin/services/churn-prediction.service.test.ts (new file)

import { describe, it, expect, vi, beforeEach } from "vitest";

const findUniqueSubscription = vi.fn();
const findFirstConversation = vi.fn();
const findFirstPaymentLog = vi.fn();
const findUniqueWorkspace = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: { findUnique: (...a: unknown[]) => findUniqueSubscription(...a) },
    conversation: { findFirst: (...a: unknown[]) => findFirstConversation(...a) },
    paymentLog: { findFirst: (...a: unknown[]) => findFirstPaymentLog(...a) },
    workspace: { findUnique: (...a: unknown[]) => findUniqueWorkspace(...a), findMany: vi.fn() },
  },
}));

describe("churnPredictionService.scoreWorkspace", () => {
  beforeEach(() => {
    findUniqueSubscription.mockReset();
    findFirstConversation.mockReset();
    findFirstPaymentLog.mockReset();
    findUniqueWorkspace.mockReset();
  });

  it("scores LOW for a healthy, active, recently-active workspace", async () => {
    findUniqueSubscription.mockResolvedValue({ status: "ACTIVE", messagesUsed: 5, messagesLimit: 10, trialEndsAt: null });
    findFirstConversation.mockResolvedValue({ lastMessageAt: new Date() }); // today
    findFirstPaymentLog.mockResolvedValue(null);
    findUniqueWorkspace.mockResolvedValue({ suspended: false });

    const { churnPredictionService } = await import("./churn-prediction.service");
    const result = await churnPredictionService.scoreWorkspace("ws1");

    expect(result.level).toBe("LOW");
    expect(result.score).toBe(0);
  });

  it("scores HIGH when suspended + no activity + failed payment all trigger", async () => {
    findUniqueSubscription.mockResolvedValue({ status: "ACTIVE", messagesUsed: 0, messagesLimit: 10, trialEndsAt: null });
    findFirstConversation.mockResolvedValue(null); // no conversation ever
    findFirstPaymentLog.mockResolvedValue({ id: "pay1" });
    findUniqueWorkspace.mockResolvedValue({ suspended: true });

    const { churnPredictionService } = await import("./churn-prediction.service");
    const result = await churnPredictionService.scoreWorkspace("ws1");

    expect(result.level).toBe("HIGH");
    expect(result.score).toBe(80); // 35 (no activity) + 25 (payment failed) + 20 (suspended)
    expect(result.signals.find((s) => s.key === "NO_ACTIVITY")?.triggered).toBe(true);
  });

  it("does not trigger TRIAL_NEARLY_EXPIRED for a referral trial (trialEndsAt set)", async () => {
    findUniqueSubscription.mockResolvedValue({
      status: "TRIALING",
      messagesUsed: 999, // would trip the 80% threshold on a standard trial
      messagesLimit: 10,
      trialEndsAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // 20 days left
    });
    findFirstConversation.mockResolvedValue({ lastMessageAt: new Date() });
    findFirstPaymentLog.mockResolvedValue(null);
    findUniqueWorkspace.mockResolvedValue({ suspended: false });

    const { churnPredictionService } = await import("./churn-prediction.service");
    const result = await churnPredictionService.scoreWorkspace("ws1");

    expect(result.signals.find((s) => s.key === "TRIAL_NEARLY_EXPIRED")?.triggered).toBe(false);
  });

  it("caps the score at 100 even if weights would exceed it", async () => {
    findUniqueSubscription.mockResolvedValue({ status: "TRIALING", messagesUsed: 9, messagesLimit: 10, trialEndsAt: null });
    findFirstConversation.mockResolvedValue(null);
    findFirstPaymentLog.mockResolvedValue({ id: "pay1" });
    findUniqueWorkspace.mockResolvedValue({ suspended: true });

    const { churnPredictionService } = await import("./churn-prediction.service");
    const result = await churnPredictionService.scoreWorkspace("ws1");

    expect(result.score).toBeLessThanOrEqual(100);
  });
});
