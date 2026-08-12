// PROPOSAL — target path: lib/workflow/engine.test.ts (new file)

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/workflow.repository", () => ({
  workflowRepository: {
    createExecution: vi.fn().mockResolvedValue({ id: "exec1" }),
    updateExecution: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/features/booking/services/booking-availability.service", () => ({
  bookingAvailabilityService: { createBooking: vi.fn() },
}));

vi.mock("@/lib/repositories/customer.repository", () => ({
  customerRepository: { createNote: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { notification: { create: vi.fn() } },
}));

vi.mock("@/lib/ai/providers/provider-router", () => ({
  providerRouter: { withFailover: vi.fn() },
}));

describe("executeWorkflow", () => {
  beforeEach(() => vi.resetModules());

  it("runs a linear graph in order and threads context between nodes", async () => {
    const { executeWorkflow } = await import("./engine");
    const { customerRepository } = await import("@/lib/repositories/customer.repository");
    vi.mocked(customerRepository.createNote).mockResolvedValue({ id: "note1" } as never);

    const graph = {
      id: "wf1",
      workspaceId: "ws1",
      nodes: [
        { id: "trigger", type: "TRIGGER_MESSAGE_RECEIVED", config: {} },
        { id: "note", type: "ACTION_ADD_CRM_NOTE", config: { customerId: "cust1", content: "hi" } },
      ],
      edges: [{ fromNodeId: "trigger", toNodeId: "note", branch: null }],
    };

    const result = await executeWorkflow(graph, "trigger", { customerId: "cust1" });

    expect(result.failed).toBe(false);
    expect(result.log.map((l) => l.nodeId)).toEqual(["trigger", "note"]);
    expect(customerRepository.createNote).toHaveBeenCalledTimes(1);
  });

  it("follows the true branch and skips the false branch on CONDITION_IF", async () => {
    const { executeWorkflow } = await import("./engine");
    const { customerRepository } = await import("@/lib/repositories/customer.repository");
    vi.mocked(customerRepository.createNote).mockResolvedValue({ id: "note1" } as never);

    const graph = {
      id: "wf1",
      workspaceId: "ws1",
      nodes: [
        { id: "trigger", type: "TRIGGER_BOOKING_STATUS_CHANGED", config: {} },
        { id: "cond", type: "CONDITION_IF", config: { field: "trigger.status", value: "CONFIRMED" } },
        { id: "onTrue", type: "ACTION_ADD_CRM_NOTE", config: { customerId: "c1", content: "confirmed!" } },
        { id: "onFalse", type: "ACTION_ADD_CRM_NOTE", config: { customerId: "c1", content: "not confirmed" } },
      ],
      edges: [
        { fromNodeId: "trigger", toNodeId: "cond", branch: null },
        { fromNodeId: "cond", toNodeId: "onTrue", branch: "true" },
        { fromNodeId: "cond", toNodeId: "onFalse", branch: "false" },
      ],
    };

    const result = await executeWorkflow(graph, "trigger", { status: "CONFIRMED" });

    expect(result.log.map((l) => l.nodeId)).toEqual(["trigger", "cond", "onTrue"]);
    expect(customerRepository.createNote).toHaveBeenCalledWith(
      expect.objectContaining({ content: "confirmed!" })
    );
  });

  it("never runs the same node twice, even if the graph has a cycle", async () => {
    const { executeWorkflow } = await import("./engine");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif1" } as never);

    const graph = {
      id: "wf1",
      workspaceId: "ws1",
      nodes: [
        { id: "a", type: "TRIGGER_MANUAL", config: {} },
        { id: "b", type: "ACTION_SEND_NOTIFICATION", config: { title: "x" } },
      ],
      // deliberately cyclic: a -> b -> a
      edges: [
        { fromNodeId: "a", toNodeId: "b", branch: null },
        { fromNodeId: "b", toNodeId: "a", branch: null },
      ],
    };

    const result = await Promise.race([
      executeWorkflow(graph, "a", {}),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timed out — likely an infinite loop")), 2000)),
    ]);

    expect((result as { log: unknown[] }).log.length).toBe(2); // a, b — then stops, never a second "a"
  });

  it("stops and marks FAILED when a node throws, without running anything after it", async () => {
    const { executeWorkflow } = await import("./engine");
    const { customerRepository } = await import("@/lib/repositories/customer.repository");
    vi.mocked(customerRepository.createNote).mockRejectedValue(new Error("boom"));

    const graph = {
      id: "wf1",
      workspaceId: "ws1",
      nodes: [
        { id: "trigger", type: "TRIGGER_MANUAL", config: {} },
        { id: "failing", type: "ACTION_ADD_CRM_NOTE", config: { customerId: "c1", content: "x" } },
        { id: "never", type: "ACTION_SEND_NOTIFICATION", config: { title: "should not run" } },
      ],
      edges: [
        { fromNodeId: "trigger", toNodeId: "failing", branch: null },
        { fromNodeId: "failing", toNodeId: "never", branch: null },
      ],
    };

    const result = await executeWorkflow(graph, "trigger", {});

    expect(result.failed).toBe(true);
    expect(result.log.map((l) => l.nodeId)).toEqual(["trigger", "failing"]);
    expect(result.log[1]!.status).toBe("FAILED");
  });
});
