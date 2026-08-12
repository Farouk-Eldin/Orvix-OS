"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";

import type { ApiResponse } from "@/types/api";
import type { QueueSnapshot } from "@/lib/queue/queue-monitor";

const QUEUE_LABELS: Record<string, string> = {
  "file-processing": "معالجة ملفات المعرفة",
  "webhook-delivery": "إرسال Webhooks للمطورين",
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

const COUNT_LABELS: { key: keyof NonNullable<QueueSnapshot["counts"]>; label: string; tone: string }[] = [
  { key: "waiting", label: "منتظرة", tone: "text-white/70" },
  { key: "active", label: "شغّالة دلوقتي", tone: "text-blue-400" },
  { key: "delayed", label: "مؤجّلة", tone: "text-amber-400" },
  { key: "completed", label: "خلصت", tone: "text-emerald-400" },
  { key: "failed", label: "فشلت", tone: "text-red-400" },
];

export default function AdminQueuesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "queues"],
    queryFn: () => fetchJson<{ queues: QueueSnapshot[] }>("/api/admin/queues"),
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">مراقبة الطوابير</h1>

      {isLoading || !data ? (
        <p className="text-sm text-white/50">بيتحمّل...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.queues.map((queue) => (
            <div key={queue.name} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{QUEUE_LABELS[queue.name] ?? queue.name}</span>
                {queue.reachable ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <XCircle className="size-4 text-red-400" />
                )}
              </div>

              {!queue.reachable ? (
                <p className="text-xs text-red-400">{queue.error}</p>
              ) : (
                <>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    {COUNT_LABELS.map((c) => (
                      <div key={c.key}>
                        <div className={`text-lg font-bold ${c.tone}`}>{queue.counts?.[c.key] ?? 0}</div>
                        <div className="text-[10px] text-white/40">{c.label}</div>
                      </div>
                    ))}
                  </div>

                  {queue.recentFailures && queue.recentFailures.length > 0 && (
                    <div className="space-y-1.5 border-t border-white/10 pt-3">
                      <div className="text-xs text-white/50">آخر فشل</div>
                      {queue.recentFailures.map((job) => (
                        <div key={job.id} className="rounded-lg bg-red-500/10 p-2 text-xs text-red-300">
                          <div className="font-medium">
                            {job.name} — {job.attemptsMade} محاولة
                          </div>
                          <div className="mt-0.5 text-red-300/70">{job.failedReason}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
