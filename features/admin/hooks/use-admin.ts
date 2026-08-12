"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useAdminStats() {
  return useQuery({ queryKey: ["admin", "stats"], queryFn: () => fetchJson("/api/v1/admin/stats") });
}

export function useAdminWorkspaces(search: string) {
  return useQuery({
    queryKey: ["admin", "workspaces", search],
    queryFn: () => fetchJson(`/api/v1/admin/workspaces?search=${encodeURIComponent(search)}`),
  });
}

export function useAdminPayments() {
  return useQuery({ queryKey: ["admin", "payments"], queryFn: () => fetchJson("/api/v1/admin/payments") });
}

export function useWorkspaceAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, action }: { workspaceId: string; action: "suspend" | "activate" }) =>
      fetchJson(`/api/v1/admin/workspaces/${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      toast.success("تم تحديث حالة النشاط");
      queryClient.invalidateQueries({ queryKey: ["admin", "workspaces"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
