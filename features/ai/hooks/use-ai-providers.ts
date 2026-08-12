"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

interface ProviderRow {
  id: string;
  provider: "GEMINI" | "GROK";
  defaultModel: string;
  enabled: boolean;
  maskedKey: string;
  createdAt: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useAiProviders() {
  return useQuery({ queryKey: ["ai-providers"], queryFn: () => fetchJson<ProviderRow[]>("/api/v1/ai/providers") });
}

export function useSaveAiProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { provider: "GEMINI" | "GROK"; apiKey: string; defaultModel: string }) =>
      fetchJson("/api/v1/ai/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("تم حفظ المفتاح بأمان");
      queryClient.invalidateQueries({ queryKey: ["ai-providers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
