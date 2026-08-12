"use client";

// PROPOSAL — target path: app/admin/marketplace/reviews/page.tsx (new file)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiResponse } from "@/types/api";

interface PendingVersion {
  id: string;
  version: string;
  permissions: string[];
  reviewNotes: string | null;
  submittedAt: string;
  app: { name: string; type: string };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function MarketplaceReviewsPage() {
  const queryClient = useQueryClient();
  const { data: pending, isLoading } = useQuery({
    queryKey: ["marketplace-reviews"],
    queryFn: () => fetchJson<PendingVersion[]>("/api/admin/marketplace/reviews"),
  });

  const decide = useMutation({
    mutationFn: ({ versionId, decision }: { versionId: string; decision: "APPROVED" | "REJECTED" }) =>
      fetchJson(`/api/admin/marketplace/reviews/${versionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      }),
    onSuccess: () => {
      toast.success("اتسجّل القرار");
      queryClient.invalidateQueries({ queryKey: ["marketplace-reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">مراجعة التطبيقات ({pending?.length ?? "..."})</h1>

      {isLoading ? (
        <p className="text-sm text-white/50">بيتحمّل...</p>
      ) : !pending?.length ? (
        <p className="text-sm text-white/50">مفيش حاجة في انتظار المراجعة</p>
      ) : (
        <div className="space-y-3">
          {pending.map((v) => (
            <div key={v.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold">{v.app.name}</span>
                  <span className="ms-2 text-xs text-white/40">v{v.version}</span>
                </div>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{v.app.type}</span>
              </div>

              {v.permissions.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {v.permissions.map((p) => (
                    <span key={p} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {v.reviewNotes && <p className="mb-3 text-xs text-white/50">سبب التحويل للمراجعة: {v.reviewNotes}</p>}

              <div className="flex gap-2">
                <button
                  onClick={() => decide.mutate({ versionId: v.id, decision: "APPROVED" })}
                  disabled={decide.isPending}
                  className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/25"
                >
                  موافقة
                </button>
                <button
                  onClick={() => decide.mutate({ versionId: v.id, decision: "REJECTED" })}
                  disabled={decide.isPending}
                  className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/25"
                >
                  رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
