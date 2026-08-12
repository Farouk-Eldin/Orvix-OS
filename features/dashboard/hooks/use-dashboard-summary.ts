"use client";

import { useQuery } from "@tanstack/react-query";

import type { dashboardService } from "@/features/dashboard/services/dashboard.service";
import type { ApiResponse } from "@/types/api";

type DashboardSummary = Awaited<ReturnType<typeof dashboardService.getSummary>>;

async function fetchSummary(): Promise<DashboardSummary> {
  const res = await fetch("/api/v1/dashboard");
  const body = (await res.json()) as ApiResponse<DashboardSummary>;
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchSummary,
    refetchInterval: 30_000,
  });
}
