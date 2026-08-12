"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, UserMinus, CalendarCheck, Wallet, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ApiResponse } from "@/types/api";

interface CrmOverview {
  newCustomers: number;
  returningCustomers: number;
  lostCustomers: number;
  totalCustomers: number;
  bookingsInPeriod: number;
  revenue: number;
  leadConversionRate: number;
  bookingConversionRate: number;
  totalLeads: number;
  convertedLeads: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function CrmReportsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["crm-reports", 30],
    queryFn: () => fetchJson<CrmOverview>("/api/v1/crm/reports?days=30"),
  });

  const cards = data
    ? [
        { label: "عملاء جدد (٣٠ يوم)", value: String(data.newCustomers), icon: UserPlus },
        { label: "عملاء عائدين", value: String(data.returningCustomers), icon: Users },
        { label: "عملاء غير نشطين", value: String(data.lostCustomers), icon: UserMinus },
        { label: "حجوزات (٣٠ يوم)", value: String(data.bookingsInPeriod), icon: CalendarCheck },
        { label: "الإيرادات (٣٠ يوم)", value: `${data.revenue.toLocaleString("ar-EG")} ج.م`, icon: Wallet },
        { label: "نسبة تحويل العملاء المحتملين", value: `${data.leadConversionRate}%`, icon: TrendingUp },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-muted" />
            ))
          : cards.map((card) => (
              <Card key={card.label} className="rounded-3xl">
                <CardContent className="flex items-center gap-3 py-5">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <card.icon className="size-5" />
                  </span>
                  <div>
                    <div className="text-xs text-muted-foreground">{card.label}</div>
                    <div className="text-xl font-bold">{card.value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {data && (
        <Card className="rounded-3xl">
          <CardContent className="py-5 text-sm text-muted-foreground">
            من {data.totalLeads} عميل محتمل، اتحوّل {data.convertedLeads} لعميل فعلي — و{data.bookingConversionRate}%
            من إجمالي {data.totalCustomers} عميل عندهم حجز واحد على الأقل.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
