// PROPOSAL — target path: lib/events/listeners/workflow.listeners.ts (new file)
// Triggers are the existing domain events, not a separate webhook/poll
// system — reuses MessageReceived / AppointmentCreated /
// BookingStatusChanged exactly as they already fire today.

import { eventBus } from "@/lib/events/event-bus";
import { workflowRepository } from "@/lib/repositories/workflow.repository";
import { featureRepository } from "@/lib/repositories/feature.repository";
import { executeWorkflow } from "@/lib/workflow/engine";

async function fireWorkflowsFor(workspaceId: string, triggerType: string, payload: Record<string, unknown>) {
  if (!(await featureRepository.isEnabled(workspaceId, "workflow"))) return;

  const workflows = await workflowRepository.findPublishedByTriggerType(workspaceId, triggerType);

  for (const workflow of workflows) {
    const triggerNode = workflow.nodes.find((n) => n.type === triggerType);
    if (!triggerNode) continue;

    // Fire-and-forget on purpose: a slow or failing workflow must never
    // delay or break the request that raised the event (e.g. an
    // incoming WhatsApp message still needs its AI reply either way).
    executeWorkflow(
      { id: workflow.id, workspaceId, nodes: workflow.nodes, edges: workflow.edges },
      triggerNode.id,
      payload
    ).catch((error) => console.error(`[workflow] execution failed for workflow ${workflow.id}:`, error));
  }
}

export function registerWorkflowListeners() {
  eventBus.onEvent("MessageReceived", async ({ workspaceId, conversationId, channel }) => {
    await fireWorkflowsFor(workspaceId, "TRIGGER_MESSAGE_RECEIVED", { conversationId, channel });
  });

  eventBus.onEvent("AppointmentCreated", async ({ workspaceId, appointmentId }) => {
    await fireWorkflowsFor(workspaceId, "TRIGGER_BOOKING_CREATED", { bookingId: appointmentId });
  });

  eventBus.onEvent("BookingStatusChanged", async ({ workspaceId, bookingId, status }) => {
    await fireWorkflowsFor(workspaceId, "TRIGGER_BOOKING_STATUS_CHANGED", { bookingId, status });
  });
}
