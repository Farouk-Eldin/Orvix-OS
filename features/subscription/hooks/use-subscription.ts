"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import type { Subscription } from "@prisma/client";
import type { ApiResponse } from "@/types/api";

async function fetchSubscription(): Promise<Subscription> {
  const res = await fetch("/api/v1/subscription");
  const body = (await res.json()) as ApiResponse<Subscription>;
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: fetchSubscription,
  });
}

export function useStartCheckout() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/payment/checkout", { method: "POST" });
      const body: ApiResponse<{ checkoutUrl: string }> = await res.json();
      if (!body.success) throw new Error(body.message);
      return body.data;
    },
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
