// PROPOSAL — target path: features/workflow-builder/lib/graph-convert.test.ts (new file)

import { describe, it, expect } from "vitest";
import { dbToFlow, flowToGraphPayload, isValidConnection } from "./graph-convert";
import type { FlowNode } from "./graph-convert";

describe("dbToFlow / flowToGraphPayload round trip", () => {
  it("preserves node type, config, and position through a full round trip", () => {
    const dbNodes = [
      { id: "n1", type: "TRIGGER_MANUAL" as const, config: {}, positionX: 100, positionY: 50 },
      {
        id: "n2",
        type: "ACTION_ADD_CRM_NOTE" as const,
        config: { customerId: "{{trigger.customerId}}", content: "hi" },
        positionX: 300,
        positionY: 50,
      },
    ];
    const dbEdges = [{ id: "e1", fromNodeId: "n1", toNodeId: "n2", branch: null }];

    const { nodes, edges } = dbToFlow(dbNodes, dbEdges);
    const payload = flowToGraphPayload(nodes, edges);

    expect(payload.nodes).toHaveLength(2);
    expect(payload.nodes[1]!.type).toBe("ACTION_ADD_CRM_NOTE");
    expect(payload.nodes[1]!.config).toEqual({ customerId: "{{trigger.customerId}}", content: "hi" });
    expect(payload.nodes[1]!.positionX).toBe(300);
    expect(payload.edges).toEqual([{ fromClientId: "n1", toClientId: "n2", branch: undefined }]);
  });

  it("preserves the branch label on a CONDITION_IF edge", () => {
    const dbEdges = [{ id: "e1", fromNodeId: "cond1", toNodeId: "action1", branch: "true" as const }];
    const { edges } = dbToFlow([], dbEdges);

    expect(edges[0]!.sourceHandle).toBe("true");
    expect(edges[0]!.label).toBe("أيوه");

    const payload = flowToGraphPayload([], edges);
    expect(payload.edges[0]!.branch).toBe("true");
  });
});

describe("isValidConnection", () => {
  const triggerNode: FlowNode = {
    id: "trigger1",
    type: "orvixNode",
    position: { x: 0, y: 0 },
    data: { nodeType: "TRIGGER_MANUAL", config: {} },
  };
  const actionNode: FlowNode = {
    id: "action1",
    type: "orvixNode",
    position: { x: 200, y: 0 },
    data: { nodeType: "ACTION_SEND_NOTIFICATION", config: {} },
  };

  it("rejects a connection whose target is a trigger node", () => {
    const ok = isValidConnection({ source: "action1", target: "trigger1", sourceHandle: null, targetHandle: null }, [
      triggerNode,
      actionNode,
    ]);
    expect(ok).toBe(false);
  });

  it("rejects a self-loop", () => {
    const ok = isValidConnection({ source: "action1", target: "action1", sourceHandle: null, targetHandle: null }, [
      triggerNode,
      actionNode,
    ]);
    expect(ok).toBe(false);
  });

  it("accepts a normal trigger -> action connection", () => {
    const ok = isValidConnection({ source: "trigger1", target: "action1", sourceHandle: null, targetHandle: null }, [
      triggerNode,
      actionNode,
    ]);
    expect(ok).toBe(true);
  });
});
