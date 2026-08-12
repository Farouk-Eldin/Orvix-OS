"use client";

import { useQuery } from "@tanstack/react-query";
import { MessagesSquare, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { dashboardService } from "@/features/dashboard/services/dashboard.service";
import type { ApiResponse } from "@/types/api";

type RecentActivity = Awaited<ReturnType<typeof dashboardService.getRecentActivity>>;

async function fetchRecentActivity(): Promise<RecentActivity> {
  const res = await fetch("/api/v1/dashboard/recent-activity");
  const body = (await res.json()) as ApiResponse<RecentActivity>;
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function RecentActivity() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", "recent-activity"],
    queryFn: fetchRecentActivity,
  });

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle className="text-base">آخر النشاطات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <div className="h-32 animate-pulse rounded-2xl bg-muted" />}

        {!isLoading && (!data || data.conversations.length === 0) && (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <MessagesSquare className="size-8 text-muted-foreground/50" />
            <p>لسه مفيش محادثات. هتظهر هنا أول ما توصّل قناة وتوصلك أول رسالة.</p>
          </div>
        )}

        {data?.conversations.map((conversation) => (
          <div
            key={conversation.id}
            className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-sm"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{conversation.customer.name ?? conversation.customer.phone ?? "عميل"}</div>
              <div className="truncate text-xs text-muted-foreground">
                {conversation.messages[0]?.content ?? "لا توجد رسائل بعد"}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
