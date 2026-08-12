"use client";

// PROPOSAL — target path: features/workflow-builder/components/orvix-node.tsx (new file)
//
// Category color is information, not decoration: it tells you at a
// glance whether a node starts a flow, does work, branches it, or calls
// the AI — the same four buckets the engine itself switches on
// (lib/workflow/engine.ts). Colors are real oklch/token-based accents
// already used elsewhere in the product, not invented for this component.
//
// Handle direction: target=Right, source=Left — flow reads right-to-left
// to match the product's Arabic-first RTL layout, so "next step" sits
// visually to the left of "previous step," same as reading order.

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap, Play, Calendar, StickyNote, Bell, GitBranch, Sparkles } from "lucide-react";

import type { NodeData, NodeType } from "@/features/workflow-builder/lib/graph-convert";

const NODE_META: Record<
  NodeType,
  { label: string; icon: typeof Zap; category: "trigger" | "action" | "condition" | "ai" }
> = {
  TRIGGER_MESSAGE_RECEIVED: { label: "رسالة جديدة", icon: Zap, category: "trigger" },
  TRIGGER_BOOKING_CREATED: { label: "حجز جديد", icon: Zap, category: "trigger" },
  TRIGGER_BOOKING_STATUS_CHANGED: { label: "تغيّرت حالة حجز", icon: Zap, category: "trigger" },
  TRIGGER_MANUAL: { label: "تشغيل يدوي", icon: Play, category: "trigger" },
  ACTION_CREATE_BOOKING: { label: "إنشاء حجز", icon: Calendar, category: "action" },
  ACTION_ADD_CRM_NOTE: { label: "إضافة ملاحظة CRM", icon: StickyNote, category: "action" },
  ACTION_SEND_NOTIFICATION: { label: "إرسال إشعار", icon: Bell, category: "action" },
  CONDITION_IF: { label: "شرط (لو)", icon: GitBranch, category: "condition" },
  AI_GENERATE_REPLY: { label: "رد بالذكاء الاصطناعي", icon: Sparkles, category: "ai" },
};

const CATEGORY_STYLE: Record<"trigger" | "action" | "condition" | "ai", { border: string; iconBg: string; iconColor: string }> = {
  trigger: { border: "border-emerald-400/50", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600" },
  action: { border: "border-primary/50", iconBg: "bg-primary/10", iconColor: "text-primary" },
  condition: { border: "border-amber-400/50", iconBg: "bg-amber-500/10", iconColor: "text-amber-600" },
  ai: { border: "border-violet-400/50", iconBg: "bg-violet-500/10", iconColor: "text-violet-600" },
};

function OrvixNodeComponent({ data, selected }: NodeProps & { data: NodeData }) {
  const meta = NODE_META[data.nodeType];
  const style = CATEGORY_STYLE[meta.category];
  const isTrigger = meta.category === "trigger";
  const isCondition = data.nodeType === "CONDITION_IF";

  return (
    <div
      className={`w-56 rounded-2xl border-2 bg-background/90 p-3 shadow-md backdrop-blur-xl transition-shadow ${style.border} ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      }`}
    >
      {!isTrigger && <Handle type="target" position={Position.Right} className="!bg-muted-foreground" />}

      <div className="flex items-center gap-2">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${style.iconBg}`}>
          <meta.icon className={`size-4 ${style.iconColor}`} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{meta.label}</div>
          <div className="text-[10px] text-muted-foreground">{isTrigger ? "بداية" : meta.category}</div>
        </div>
      </div>

      {isCondition ? (
        <>
          <Handle type="source" position={Position.Left} id="true" style={{ top: "35%" }} className="!bg-emerald-500" />
          <Handle type="source" position={Position.Left} id="false" style={{ top: "65%" }} className="!bg-destructive" />
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>لأ ↖</span>
            <span>أيوه ↙</span>
          </div>
        </>
      ) : (
        <Handle type="source" position={Position.Left} className="!bg-primary" />
      )}
    </div>
  );
}

export const OrvixNode = memo(OrvixNodeComponent);
export const nodeTypes = { orvixNode: OrvixNode };
export { NODE_META };
