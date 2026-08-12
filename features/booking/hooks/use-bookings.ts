"use client";

// PROPOSAL — target path: features/booking/hooks/use-bookings.ts (new file)
// Same fetchJson + react-query + sonner pattern as features/admin/hooks/use-admin.ts

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export function useBookings(params: { status?: BookingStatus; search?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));

  return useQuery({
    queryKey: ["bookings", params.status, params.search, params.page],
    queryFn: () => fetchJson(`/api/v1/bookings?${query.toString()}`),
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      bookingId,
      ...data
    }: {
      bookingId: string;
      status?: BookingStatus;
      startAtIso?: string;
      notes?: string;
    }) =>
      fetchJson(`/api/v1/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تم تحديث الحجز");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useServices() {
  return useQuery({ queryKey: ["services"], queryFn: () => fetchJson("/api/v1/services") });
}

export function useResources() {
  return useQuery({ queryKey: ["resources"], queryFn: () => fetchJson("/api/v1/resources") });
}
