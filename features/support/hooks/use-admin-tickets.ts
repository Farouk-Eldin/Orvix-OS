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

interface AdminTicketFilters {
  status?: string;
  priority?: string;
  assignedAdminId?: string;
  search?: string;
  page?: number;
}

export function useAdminTickets(params: AdminTicketFilters) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.priority) query.set("priority", params.priority);
  if (params.assignedAdminId) query.set("assignedAdminId", params.assignedAdminId);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));

  return useQuery({
    queryKey: ["admin-support-tickets", params],
    queryFn: () => fetchJson(`/api/admin/support/tickets?${query.toString()}`),
  });
}

export function useAdminTicketDetail(ticketId: string | null) {
  return useQuery({
    queryKey: ["admin-support-ticket", ticketId],
    queryFn: () => fetchJson(`/api/admin/support/tickets/${ticketId}`),
    enabled: !!ticketId,
    refetchInterval: 15000,
  });
}

export function useAdminReplyToTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { body: string; isInternalNote?: boolean }) =>
      fetchJson(`/api/admin/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      toast.success(variables.isInternalNote ? "تم حفظ الملاحظة" : "تم إرسال الرد");
      queryClient.invalidateQueries({ queryKey: ["admin-support-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateAdminTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { status?: string; priority?: string; assignedAdminId?: string | null }) =>
      fetchJson(`/api/admin/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تم التحديث");
      queryClient.invalidateQueries({ queryKey: ["admin-support-ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
