"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

interface FeatureRequestRow {
  id: string;
  title: string;
  description: string;
  status: "PLANNED" | "IN_PROGRESS" | "TESTING" | "RELEASED";
  voteCount: number;
  submittedByName: string;
}

const STATUS_OPTIONS = ["PLANNED", "IN_PROGRESS", "TESTING", "RELEASED"];
const STATUS_LABEL: Record<string, string> = {
  PLANNED: "مخطط له",
  IN_PROGRESS: "شغالين عليه",
  TESTING: "بيتجرّب",
  RELEASED: "مُطلَق",
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function AdminFeedbackPage() {
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin", "feedback"],
    queryFn: () => fetchJson<FeatureRequestRow[]>("/api/v1/feedback"),
  });

  const updateStatus = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      fetchJson(`/api/admin/feedback/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: () => {
      toast.success("تم التحديث");
      queryClient.invalidateQueries({ queryKey: ["admin", "feedback"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">إدارة الاقتراحات</h1>

      {isLoading ? (
        <p className="text-sm text-white/50">بيتحمّل...</p>
      ) : (
        <div className="space-y-2">
          {requests?.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {r.title} <span className="text-xs text-white/40">· {r.voteCount} صوت</span>
                </div>
                <div className="text-sm text-white/50">{r.description}</div>
              </div>
              <select
                value={r.status}
                onChange={(e) => updateStatus.mutate({ id: r.id, status: e.target.value })}
                className="shrink-0 rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className="bg-black">
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
