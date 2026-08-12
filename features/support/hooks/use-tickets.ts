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

export function useTickets() {
  return useQuery({
    queryKey: ["support-tickets"],
    queryFn: () => fetchJson("/api/v1/support/tickets"),
  });
}

export function useTicketDetail(ticketId: string | null) {
  return useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: () => fetchJson(`/api/v1/support/tickets/${ticketId}`),
    enabled: !!ticketId,
    // No websocket layer in this project yet — a short poll keeps an open
    // thread feeling live without one.
    refetchInterval: 15000,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { subject: string; body: string; category?: string; priority?: string }) =>
      fetchJson("/api/v1/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تم إرسال التذكرة");
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useReplyToTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      fetchJson(`/api/v1/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useCloseTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetchJson(`/api/v1/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      }),
    onSuccess: () => {
      toast.success("تم إغلاق التذكرة");
      queryClient.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
