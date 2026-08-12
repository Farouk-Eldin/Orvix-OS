"use client";

// PROPOSAL — target path: features/onboarding/components/checklist-widget.tsx (new file)
// Drop into app/(app)/dashboard/page.tsx above the StatCardGrid.

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { ApiResponse } from "@/types/api";

interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  href: string;
}
interface ChecklistData {
  items: ChecklistItem[];
  completedCount: number;
  totalCount: number;
  percent: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function ChecklistWidget() {
  const [expanded, setExpanded] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const { data } = useQuery({
    queryKey: ["onboarding-checklist"],
    queryFn: () => fetchJson<ChecklistData>("/api/v1/onboarding/checklist"),
  });

  if (!data || data.percent === 100 || dismissed) return null;

  return (
    <div className="glass-panel rounded-2xl p-4">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center justify-between">
        <div className="text-start">
          <div className="text-sm font-semibold">
            خطوات البداية ({data.completedCount}/{data.totalCount})
          </div>
          <Progress value={data.percent} className="mt-2 h-1.5 w-48" />
        </div>
        {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t pt-3">
          {data.items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                  item.done ? "bg-primary text-primary-foreground" : "border"
                }`}
              >
                {item.done && <Check className="size-3" />}
              </span>
              <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
            </Link>
          ))}
          <button onClick={() => setDismissed(true)} className="mt-1 text-xs text-muted-foreground hover:underline">
            إخفاء
          </button>
        </div>
      )}
    </div>
  );
}
