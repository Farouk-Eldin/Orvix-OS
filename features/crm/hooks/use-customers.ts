"use client";

// PROPOSAL — target path: features/crm/hooks/use-customers.ts (new file)

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useCustomers(params: { search?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 1));

  return useQuery({
    queryKey: ["customers", params.search, params.page],
    queryFn: () => fetchJson(`/api/v1/customers?${query.toString()}`),
  });
}

export function useCustomerDetail(customerId: string | null) {
  return useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => fetchJson(`/api/v1/customers/${customerId}`),
    enabled: !!customerId,
  });
}

export function useAddCustomerNote(customerId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; visibility?: "PRIVATE" | "INTERNAL" }) =>
      fetchJson(`/api/v1/customers/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تمت إضافة الملاحظة");
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
