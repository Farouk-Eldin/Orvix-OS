"use client";

import { AlertTriangle } from "lucide-react";

import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";

export function TrialUsageBanner() {
  const { data } = useDashboardSummary();
  const sub = data?.subscription;

  if (!sub || sub.plan !== "FREE" || sub.status !== "TRIALING") return null;

  const used = sub.messagesUsed;
  const limit = sub.messagesLimit;
  const percent = Math.min(100, Math.round((used / limit) * 100));

  if (used < 8) {
    return (
      <div className="mb-6 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            استخدمت {used} من {limit} رسالة مجانية
          </span>
          <span className="font-medium">
            {used} / {limit}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    );
  }

  const remaining = Math.max(0, limit - used);
  const message =
    remaining === 0 ? "انتهت رسائلك المجانية." : remaining === 1 ? "تبقت رسالة واحدة." : "يتبقى رسالتان فقط.";

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300/50 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 backdrop-blur-xl">
      <AlertTriangle className="size-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <a href="/dashboard/subscription" className="font-medium underline underline-offset-2">
        اشترك الآن
      </a>
    </div>
  );
}
