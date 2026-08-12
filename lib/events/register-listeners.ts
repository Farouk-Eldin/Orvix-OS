// PROPOSAL — target path: lib/events/register-listeners.ts (replaces existing file)
// Only addition: registerReferralListeners, alongside workflow and
// webhook-dispatch listeners added earlier this session.

import { registerNotificationListeners } from "@/lib/events/listeners/notification.listeners";
import { registerAuditListeners } from "@/lib/events/listeners/audit.listeners";
import { registerEmailListeners } from "@/lib/events/listeners/email.listeners";
import { registerWorkflowListeners } from "@/lib/events/listeners/workflow.listeners";
import { registerWebhookDispatchListeners } from "@/lib/events/listeners/webhook-dispatch.listeners";
import { registerReferralListeners } from "@/lib/events/listeners/referral.listeners";
import { registerAiMemoryListeners } from "@/lib/events/listeners/ai-memory.listeners";
import { registerOAuthIntegrationListeners } from "@/lib/events/listeners/oauth-integrations.listeners";
import { registerBookingReminderListeners } from "@/lib/events/listeners/booking-reminder.listeners";

let registered = false;

/**
 * Idempotent — Next's dev server can re-run instrumentation on hot
 * reload, and we never want duplicate listeners double-firing every event.
 */
export function registerAllListeners() {
  if (registered) return;
  registerNotificationListeners();
  registerAuditListeners();
  registerEmailListeners();
  registerWorkflowListeners();
  registerWebhookDispatchListeners();
  registerReferralListeners();
  registerAiMemoryListeners();
  registerOAuthIntegrationListeners();
  registerBookingReminderListeners();
  registered = true;
  console.log("[events] domain event listeners registered");
}
