"use client";

import { useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/types/api";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useConversations(search: string, channel?: string) {
  return useQuery({
    queryKey: ["conversations", search, channel],
    queryFn: () =>
      fetchJson(`/api/v1/conversations?search=${encodeURIComponent(search)}${channel ? `&channel=${channel}` : ""}`),
  });
}

export function useConversationDetail(conversationId: string) {
  return useQuery({
    queryKey: ["conversations", conversationId],
    queryFn: () => fetchJson(`/api/v1/conversations/${conversationId}`),
    enabled: !!conversationId,
    refetchInterval: 10000,
  });
}
