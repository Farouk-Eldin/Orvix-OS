import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  isLoading?: boolean;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, isLoading, className }: StatCardProps) {
  return (
    <Card className={cn("rounded-2xl", className)}>
      <CardContent className="flex items-center gap-4 px-5 py-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-0.5 text-2xl font-bold">
            {isLoading ? <span className="inline-block h-6 w-12 animate-pulse rounded bg-muted" /> : value}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
