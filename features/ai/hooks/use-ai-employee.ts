"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { AIEmployee } from "@prisma/client";
import type { ApiResponse } from "@/types/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useAiEmployee() {
  return useQuery({ queryKey: ["ai-employee"], queryFn: () => fetchJson<AIEmployee>("/api/v1/ai/employee") });
}

export function useUpdateAiEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AIEmployee>) =>
      fetchJson<AIEmployee>("/api/v1/ai/employee", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تم الحفظ");
      queryClient.invalidateQueries({ queryKey: ["ai-employee"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
