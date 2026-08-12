// PROPOSAL — target path: lib/events/listeners/referral.listeners.ts (new file)

import { eventBus } from "@/lib/events/event-bus";
import { referralRepository } from "@/lib/repositories/referral.repository";

export function registerReferralListeners() {
  eventBus.onEvent("PaymentSucceeded", async ({ workspaceId }) => {
    // No-op for the ~majority of workspaces with no Referral row —
    // updateMany with zero matches is cheap and silent, no lookup-then-branch needed.
    await referralRepository.markConverted(workspaceId);
  });
}
