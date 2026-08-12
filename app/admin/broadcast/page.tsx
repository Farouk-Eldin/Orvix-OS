"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

interface WorkspaceOption {
  id: string;
  name: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "كل الأنشطة" },
  { value: "PLAN", label: "خطة معيّنة" },
  { value: "WORKSPACE", label: "نشاط معيّن" },
] as const;

export default function AdminBroadcastPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL" | "PLAN" | "WORKSPACE">("ALL");
  const [plan, setPlan] = useState<"FREE" | "PRO">("PRO");
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(false);

  const { data: workspaceResults } = useQuery({
    queryKey: ["admin", "workspaces-search", workspaceSearch],
    queryFn: () =>
      fetchJson<{ workspaces: WorkspaceOption[] }>(
        `/api/v1/admin/workspaces?search=${encodeURIComponent(workspaceSearch)}`
      ),
    enabled: audience === "WORKSPACE" && workspaceSearch.length > 1,
  });

  const send = useMutation({
    mutationFn: () =>
      fetchJson<{ sentCount: number }>("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          audience,
          sendEmail,
          ...(audience === "PLAN" ? { plan } : {}),
          ...(audience === "WORKSPACE" ? { workspaceId } : {}),
        }),
      }),
    onSuccess: (data) => {
      toast.success(`اتبعتت لـ ${data.sentCount} نشاط`);
      setTitle("");
      setBody("");
      setWorkspaceId(null);
      setWorkspaceSearch("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSend =
    !!title.trim() &&
    !!body.trim() &&
    (audience !== "PLAN" || !!plan) &&
    (audience !== "WORKSPACE" || !!workspaceId);

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-lg font-bold">إشعار جماعي</h1>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="space-y-1.5">
          <div className="text-sm">العنوان</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثلاً: صيانة مجدولة الجمعة"
            className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-sm">الرسالة</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-sm">لمين؟</div>
          <div className="flex gap-1.5">
            {AUDIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAudience(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  audience === opt.value ? "bg-white text-black" : "bg-white/10 text-white/60 hover:bg-white/15"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {audience === "PLAN" && (
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as "FREE" | "PRO")}
            className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm"
          >
            <option value="FREE">تجريبي (Free)</option>
            <option value="PRO">مدفوع (Pro)</option>
          </select>
        )}

        {audience === "WORKSPACE" && (
          <div className="space-y-1.5">
            <input
              value={workspaceSearch}
              onChange={(e) => {
                setWorkspaceSearch(e.target.value);
                setWorkspaceId(null);
              }}
              placeholder="دوّر باسم النشاط..."
              className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
            />
            {workspaceId ? (
              <div className="rounded-lg bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-400">
                اتحدد: {workspaceSearch}
              </div>
            ) : (
              workspaceResults?.workspaces && workspaceResults.workspaces.length > 0 && (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-1">
                  {workspaceResults.workspaces.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => {
                        setWorkspaceId(w.id);
                        setWorkspaceSearch(w.name);
                      }}
                      className="w-full rounded-md px-2 py-1.5 text-start text-sm hover:bg-white/10"
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        <label className="flex items-center gap-1.5 text-xs text-white/60">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
          ابعت إيميل حقيقي كمان (مش إشعار داخل التطبيق بس)
        </label>

        <button
          disabled={!canSend || send.isPending}
          onClick={() => send.mutate()}
          className="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-40"
        >
          {send.isPending ? "جاري الإرسال..." : "إرسال"}
        </button>
      </div>
    </div>
  );
}
