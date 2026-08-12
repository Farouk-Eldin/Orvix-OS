import { eventBus } from "@/lib/events/event-bus";
import { customerMemoryService } from "@/features/ai/services/customer-memory.service";

export function registerAiMemoryListeners() {
  eventBus.onEvent("AiReplySent", async ({ workspaceId, customerId }) => {
    // No customerId means the AI Test Playground, not a real conversation
    // — nothing to remember, and nothing that should be remembered.
    if (!customerId) return;
    await customerMemoryService.refreshIfStale(customerId, workspaceId);
  });
}
