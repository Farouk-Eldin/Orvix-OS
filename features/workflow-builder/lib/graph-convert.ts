// PROPOSAL — target path: features/workflow-builder/lib/graph-convert.ts (new file)
//
// Converts between the DB shape (WorkflowNode/WorkflowEdge, real ids)
// and @xyflow/react's Node/Edge shape (string ids, position: {x,y},
// data: unknown). Kept as pure functions with no React/xyflow imports
// so they're trivially unit-testable on their own.

import type { Node, Edge, Connection } from "@xyflow/react";

export type NodeType =
  | "TRIGGER_MESSAGE_RECEIVED"
  | "TRIGGER_BOOKING_CREATED"
  | "TRIGGER_BOOKING_STATUS_CHANGED"
  | "TRIGGER_MANUAL"
  | "ACTION_CREATE_BOOKING"
  | "ACTION_ADD_CRM_NOTE"
  | "ACTION_SEND_NOTIFICATION"
  | "CONDITION_IF"
  | "AI_GENERATE_REPLY";

export interface NodeData extends Record<string, unknown> {
  nodeType: NodeType;
  config: Record<string, unknown>;
}

export type FlowNode = Node<NodeData>;

export interface DbNode {
  id: string;
  type: NodeType;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}
export interface DbEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  branch: "true" | "false" | null;
}

export function dbToFlow(dbNodes: DbNode[], dbEdges: DbEdge[]): { nodes: FlowNode[]; edges: Edge[] } {
  const nodes: FlowNode[] = dbNodes.map((n) => ({
    id: n.id,
    type: "orvixNode",
    position: { x: n.positionX, y: n.positionY },
    data: { nodeType: n.type, config: n.config },
  }));

  const edges: Edge[] = dbEdges.map((e) => ({
    id: e.id,
    source: e.fromNodeId,
    target: e.toNodeId,
    sourceHandle: e.branch ?? undefined, // "true"/"false" handle on CONDITION_IF nodes, undefined otherwise
    label: e.branch ? (e.branch === "true" ? "أيوه" : "لأ") : undefined,
  }));

  return { nodes, edges };
}

// clientId = the flow node's own id, whether it's a fresh (unsaved) node
// or an existing DB node keeping its real id. The graph-replace endpoint
// doesn't care whether a clientId happens to look like a UUID — it only
// needs internal consistency within one request.
export function flowToGraphPayload(nodes: FlowNode[], edges: Edge[]) {
  return {
    nodes: nodes.map((n) => ({
      clientId: n.id,
      type: n.data.nodeType,
      config: n.data.config,
      positionX: n.position.x,
      positionY: n.position.y,
    })),
    edges: edges.map((e) => ({
      fromClientId: e.source,
      toClientId: e.target,
      branch: e.sourceHandle === "true" || e.sourceHandle === "false" ? e.sourceHandle : undefined,
    })),
  };
}

export function isValidConnection(connection: Connection, nodes: FlowNode[]): boolean {
  // A trigger node can only ever be a source, never a target — nothing
  // should point INTO the start of the flow.
  const targetNode = nodes.find((n) => n.id === connection.target);
  if (targetNode?.data.nodeType.startsWith("TRIGGER_")) return false;
  return connection.source !== connection.target; // no self-loops
}
