"use client";

import { useQuery } from "@tanstack/react-query";

import type { dashboardService } from "@/features/dashboard/services/dashboard.service";
import type { ApiResponse } from "@/types/api";

type FullAnalytics = Awaited<ReturnType<typeof dashboardService.getFullAnalytics>>;

async function fetchAnalytics(days: number): Promise<FullAnalytics> {
  const res = await fetch(`/api/v1/dashboard/analytics?days=${days}`);
  const body = (await res.json()) as ApiResponse<FullAnalytics>;
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useDashboardAnalytics(days = 14) {
  return useQuery({
    queryKey: ["dashboard", "analytics", days],
    queryFn: () => fetchAnalytics(days),
  });
}
