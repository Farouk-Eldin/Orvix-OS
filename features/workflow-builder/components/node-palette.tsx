"use client";

// PROPOSAL — target path: features/workflow-builder/components/node-palette.tsx (new file)

import { NODE_META } from "@/features/workflow-builder/components/orvix-node";
import type { NodeType } from "@/features/workflow-builder/lib/graph-convert";

const GROUPS: { category: "trigger" | "action" | "condition" | "ai"; label: string }[] = [
  { category: "trigger", label: "بدايات" },
  { category: "action", label: "أفعال" },
  { category: "condition", label: "شروط" },
  { category: "ai", label: "ذكاء اصطناعي" },
];

export function NodePalette({ onAdd }: { onAdd: (type: NodeType) => void }) {
  return (
    <div className="w-52 shrink-0 space-y-4 overflow-y-auto rounded-2xl border bg-background/80 p-3 backdrop-blur-xl">
      {GROUPS.map((group) => {
        const items = (Object.keys(NODE_META) as NodeType[]).filter((k) => NODE_META[k].category === group.category);
        return (
          <div key={group.category}>
            <div className="mb-1.5 px-1 text-xs font-semibold text-muted-foreground">{group.label}</div>
            <div className="space-y-1">
              {items.map((type) => {
                const meta = NODE_META[type];
                return (
                  <button
                    key={type}
                    onClick={() => onAdd(type)}
                    className="flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-start text-xs hover:bg-accent"
                  >
                    <meta.icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
