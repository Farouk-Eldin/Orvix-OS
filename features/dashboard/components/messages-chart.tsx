"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardAnalytics } from "@/features/dashboard/hooks/use-dashboard-analytics";

export function MessagesChart() {
  const { data, isLoading } = useDashboardAnalytics(14);

  const chartData = (data?.timeSeries ?? []).map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("ar-EG", { day: "numeric", month: "short" }),
  }));

  const hasData = chartData.some((d) => d.messages > 0);

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle className="text-base">الرسائل خلال آخر 14 يوم</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-muted" />
        ) : !hasData ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <p>لسه مفيش رسائل مسجّلة.</p>
            <p className="text-xs">الرسم هيتفعّل تلقائيًا أول ما تبدأ المحادثات تدخل.</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="messagesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill="url(#messagesFill)"
                  name="الرسائل"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
