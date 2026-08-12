"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

interface WorkspaceOption {
  id: string;
  name: string;
}
interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function AdminFeatureFlagsPage() {
  const queryClient = useQueryClient();
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceOption | null>(null);

  const { data: workspaceResults } = useQuery({
    queryKey: ["admin", "workspaces-search", workspaceSearch],
    queryFn: () =>
      fetchJson<{ workspaces: WorkspaceOption[] }>(
        `/api/v1/admin/workspaces?search=${encodeURIComponent(workspaceSearch)}`
      ),
    enabled: !workspace && workspaceSearch.length > 1,
  });

  const { data: flagsData, isLoading } = useQuery({
    queryKey: ["admin", "feature-flags", workspace?.id],
    queryFn: () => fetchJson<{ flags: FeatureFlag[] }>(`/api/admin/feature-flags?workspaceId=${workspace!.id}`),
    enabled: !!workspace,
  });

  const toggle = useMutation({
    mutationFn: (data: { key: string; enabled: boolean }) =>
      fetchJson("/api/admin/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace!.id, ...data }),
      }),
    onSuccess: () => {
      toast.success("اتحدّث");
      queryClient.invalidateQueries({ queryKey: ["admin", "feature-flags", workspace?.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-bold">مفاتيح المزايا</h1>
        <p className="mt-1 text-xs text-white/40">
          مفاتيح حقيقية بتتحكم في كود فعلي بس — مفيش مفتاح هنا من غير تأثير حقيقي.
        </p>
      </div>

      <div className="space-y-1.5">
        <input
          value={workspace ? workspace.name : workspaceSearch}
          onChange={(e) => {
            setWorkspace(null);
            setWorkspaceSearch(e.target.value);
          }}
          placeholder="دوّر باسم النشاط عشان تعدّل مزاياه..."
          className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
        />
        {!workspace && workspaceResults?.workspaces && workspaceResults.workspaces.length > 0 && (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-1">
            {workspaceResults.workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => setWorkspace(w)}
                className="w-full rounded-md px-2 py-1.5 text-start text-sm hover:bg-white/10"
              >
                {w.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {workspace && (
        <div className="space-y-3">
          {isLoading || !flagsData ? (
            <p className="text-sm text-white/50">بيتحمّل...</p>
          ) : (
            flagsData.flags.map((flag) => (
              <div key={flag.key} className="space-y-1.5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{flag.label}</span>
                  <input
                    type="checkbox"
                    checked={flag.enabled}
                    onChange={(e) => toggle.mutate({ key: flag.key, enabled: e.target.checked })}
                  />
                </div>
                <p className="text-xs text-white/40">{flag.description}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
