"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";

export function UpgradeModal() {
  const { data } = useDashboardSummary();
  const sub = data?.subscription;

  const isBlocked =
    !!sub && sub.plan === "FREE" && sub.status !== "ACTIVE" && sub.messagesUsed >= sub.messagesLimit;

  return (
    <Dialog open={isBlocked}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="text-center"
      >
        <DialogHeader className="items-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </span>
          <DialogTitle>انتهت الفترة المجانية</DialogTitle>
          <DialogDescription>لقد استخدمت جميع الرسائل المجانية. اشترك الآن للاستمرار.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="text-4xl font-bold">
            999<span className="ms-1 text-base font-normal text-muted-foreground">جنيه شهريًا</span>
          </div>
          <Button size="lg" className="w-full" asChild>
            <a href="/dashboard/subscription">اشترك الآن</a>
          </Button>
          <p className="text-xs text-muted-foreground">
            المحادثات الواردة بتتسجّل عادي، بس الردود التلقائية متوقفة لحد ما تشترك.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
