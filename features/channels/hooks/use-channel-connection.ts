"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

type ChannelKey = "whatsapp" | "facebook" | "instagram";

interface ChannelStatus {
  status: "CONNECTED" | "DISCONNECTED" | "ERROR" | "TOKEN_EXPIRED";
  connectedAt: string;
  phoneNumber?: string;
  pageName?: string;
  username?: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useChannelStatus(channel: ChannelKey) {
  return useQuery({
    queryKey: ["channel-status", channel],
    queryFn: () => fetchJson<ChannelStatus | null>(`/api/v1/channels/${channel}`),
  });
}

export function useConnectChannel(channel: ChannelKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, string>) =>
      fetchJson(`/api/v1/channels/${channel}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("تم الربط بنجاح");
      queryClient.invalidateQueries({ queryKey: ["channel-status", channel] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDisconnectChannel(channel: ChannelKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => fetchJson(`/api/v1/channels/${channel}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم الفصل");
      queryClient.invalidateQueries({ queryKey: ["channel-status", channel] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
