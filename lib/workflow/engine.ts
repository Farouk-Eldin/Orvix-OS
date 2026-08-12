// PROPOSAL — target path: lib/workflow/engine.ts (new file)
//
// Deliberately NOT generic/pluggable-from-outside yet — every handler
// below calls a real service that already exists in this codebase.
// Adding a new node type is: add the enum value in schema.prisma, add
// one case here. No plugin loader, no dynamic imports — that layer is
// only worth building once there's a real second consumer of it
// (the marketplace milestone), per the doc's own architecture rules.

import { workflowRepository } from "@/lib/repositories/workflow.repository";
import { bookingAvailabilityService } from "@/features/booking/services/booking-availability.service";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { providerRouter } from "@/lib/ai/providers/provider-router";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface EngineNode {
  id: string;
  type: string;
  // Prisma's Json column type (JsonValue) is wider than a plain object —
  // it can be null, a primitive, or an array, since a JSON column
  // technically permits any of those. Every node this engine actually
  // creates stores a plain object here, but the TYPE has to admit the
  // wider possibility since that's genuinely what Prisma hands back.
  // Normalized down to a safe Record right before use — see
  // normalizeConfig() below, called once at the top of runNode().
  config: unknown;
}
interface EngineEdge {
  fromNodeId: string;
  toNodeId: string;
  branch: string | null;
}
interface WorkflowGraph {
  id: string;
  workspaceId: string;
  nodes: EngineNode[];
  edges: EngineEdge[];
}

type LogEntry = {
  nodeId: string;
  type: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  output?: unknown;
  error?: string;
  ms: number;
};

// Reads a dot path like "trigger.customerId" or "node_abc.bookingId" out
// of the accumulated context. Missing paths return undefined rather than
// throwing — a workflow author's typo shouldn't crash the whole run.
function resolvePath(context: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, context);
}

// Replaces "{{trigger.phone}}" style placeholders inside a config value
// with real values from context. Only strings are interpolated; other
// types pass through as-is.
function interpolate(value: unknown, context: Record<string, unknown>): unknown {
  if (typeof value !== "string") return value;
  const match = value.match(/^\{\{(.+)\}\}$/);
  if (!match) return value;
  return resolvePath(context, match[1]!.trim());
}

function interpolateConfig(config: Record<string, unknown>, context: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(config).map(([k, v]) => [k, interpolate(v, context)]));
}

// Narrows EngineNode.config (unknown — see its definition above) down to
// a safe Record for actual use. Every node this engine creates really
// does store a plain object; this only guards against the type-level
// possibility (null, an array, a primitive) that Prisma's Json column
// type admits but application code never intentionally produces.
function normalizeConfig(config: unknown): Record<string, unknown> {
  if (config && typeof config === "object" && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

async function runNode(
  node: EngineNode,
  workspaceId: string,
  context: Record<string, unknown>
): Promise<{ output: unknown; branch?: "true" | "false" }> {
  const cfg = interpolateConfig(normalizeConfig(node.config), context);

  switch (node.type) {
    case "ACTION_CREATE_BOOKING": {
      const booking = await bookingAvailabilityService.createBooking({
        workspaceId,
        customerId: String(cfg.customerId),
        serviceId: String(cfg.serviceId),
        resourceId: cfg.resourceId ? String(cfg.resourceId) : undefined,
        startAt: new Date(String(cfg.startAtIso)),
        channel: String(cfg.channel ?? "DASHBOARD"),
        createdByAI: false,
      });
      return { output: { bookingId: booking.id, startAt: booking.startAt } };
    }

    case "ACTION_ADD_CRM_NOTE": {
      const note = await customerRepository.createNote({
        workspace: { connect: { id: workspaceId } },
        customer: { connect: { id: String(cfg.customerId) } },
        content: String(cfg.content),
        createdByAI: true,
      });
      return { output: { noteId: note.id } };
    }

    case "ACTION_SEND_NOTIFICATION": {
      const notification = await prisma.notification.create({
        data: {
          workspace: { connect: { id: workspaceId } },
          type: "SYSTEM",
          title: String(cfg.title ?? "Orvix Flow"),
          body: String(cfg.message ?? ""),
        },
      });
      return { output: { notificationId: notification.id } };
    }

    case "CONDITION_IF": {
      const left = resolvePath(context, String(cfg.field));
      const right = cfg.value;
      const result = String(left) === String(right);
      return { output: { result }, branch: result ? "true" : "false" };
    }

    case "AI_GENERATE_REPLY": {
      const { result } = await providerRouter.withFailover(workspaceId, (provider) =>
        provider.generateResponse({
          systemPrompt: String(cfg.systemPrompt ?? "رد بإيجاز واحترافية."),
          history: [],
          userMessage: String(cfg.prompt ?? ""),
          maxOutputTokens: 300,
        })
      );
      return { output: { text: result.content } };
    }

    // Trigger nodes are entry points, not executable steps — reaching
    // one mid-walk (shouldn't happen with a well-formed graph) is a
    // no-op rather than a crash.
    default:
      return { output: null };
  }
}

export async function executeWorkflow(graph: WorkflowGraph, triggerNodeId: string, triggerPayload: Record<string, unknown>) {
  const execution = await workflowRepository.createExecution({
    workflow: { connect: { id: graph.id } },
    triggerPayload: triggerPayload as Prisma.InputJsonValue,
  });

  const context: Record<string, unknown> = { trigger: triggerPayload };
  const log: LogEntry[] = [];
  const visited = new Set<string>(); // cycle guard — a node runs at most once per execution

  let currentId: string | undefined = triggerNodeId;
  let failed = false;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = graph.nodes.find((n) => n.id === currentId);
    if (!node) break;

    const started = Date.now();
    try {
      const { output, branch } = await runNode(node, graph.workspaceId, context);
      context[`node_${node.id}`] = output;
      log.push({ nodeId: node.id, type: node.type, status: "SUCCESS", output, ms: Date.now() - started });

      const outgoing = graph.edges.filter((e) => e.fromNodeId === node.id);
      const next = node.type === "CONDITION_IF" ? outgoing.find((e) => e.branch === branch) : outgoing[0];
      currentId = next?.toNodeId;
    } catch (error) {
      log.push({
        nodeId: node.id,
        type: node.type,
        status: "FAILED",
        error: error instanceof Error ? error.message : "unknown error",
        ms: Date.now() - started,
      });
      failed = true;
      break;
    }
  }

  await workflowRepository.updateExecution(execution.id, {
    status: failed ? "FAILED" : "SUCCESS",
    log: log as never,
    finishedAt: new Date(),
  });

  return { executionId: execution.id, failed, log };
}
