// PROPOSAL — target path: lib/workflow/node-types.ts (new file)
//
// The one place this list is declared. Before this file, the same nine
// strings were hand-typed in three places (workflows-route.ts,
// workflow-graph-route.ts, graph-convert.ts's NodeType union) — verified
// identical right now, but that's luck, not a guarantee, for whoever
// adds node type #10 later. Every consumer below imports from here instead.

export const NODE_TYPES = [
  "TRIGGER_MESSAGE_RECEIVED",
  "TRIGGER_BOOKING_CREATED",
  "TRIGGER_BOOKING_STATUS_CHANGED",
  "TRIGGER_MANUAL",
  "ACTION_CREATE_BOOKING",
  "ACTION_ADD_CRM_NOTE",
  "ACTION_SEND_NOTIFICATION",
  "CONDITION_IF",
  "AI_GENERATE_REPLY",
] as const;

export type WorkflowNodeType = (typeof NODE_TYPES)[number];
