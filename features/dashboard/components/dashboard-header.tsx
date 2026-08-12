"use client";

import { UserButton } from "@clerk/nextjs";
import { Bell, Search, CheckCheck } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useMarkNotificationsRead, useNotifications } from "@/features/dashboard/hooks/use-notifications";

interface DashboardHeaderProps {
  workspaceName: string;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "دلوقتي";
  if (mins < 60) return `من ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `من ${hours} ساعة`;
  return `من ${Math.floor(hours / 24)} يوم`;
}

export function DashboardHeader({ workspaceName }: DashboardHeaderProps) {
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();

  return (
    <header className="glass-panel sticky top-4 z-40 mb-6 flex items-center justify-between gap-4 rounded-2xl px-5 py-3 shadow-sm">
      <div className="min-w-0">
        <div className="truncate font-semibold">{workspaceName}</div>
      </div>

      <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-1.5 text-sm text-muted-foreground sm:flex">
        <Search className="size-4 shrink-0" />
        <span>البحث قريبًا...</span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded-lg border border-border px-2 py-1 text-xs font-medium text-muted-foreground">
          AR
        </span>

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="الإشعارات"
            >
              <Bell className="size-4.5" />
              {!!data?.unreadCount && (
                <span className="absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
                  {data.unreadCount > 9 ? "9+" : data.unreadCount}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <div className="flex items-center justify-between border-b border-border p-3">
              <span className="text-sm font-semibold">الإشعارات</span>
              {!!data?.unreadCount && (
                <Button variant="ghost" size="sm" onClick={() => markRead.mutate()} className="h-7 text-xs">
                  <CheckCheck className="size-3.5" /> علّم الكل كمقروء
                </Button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {!data?.notifications.length ? (
                <p className="p-6 text-center text-xs text-muted-foreground">مفيش إشعارات لسه</p>
              ) : (
                data.notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`border-b border-border p-3 last:border-0 ${!n.read ? "bg-primary/5" : ""}`}
                  >
                    <div className="text-sm font-medium">{n.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground/70">{timeAgo(n.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
