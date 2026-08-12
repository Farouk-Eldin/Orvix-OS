"use client";

import { BarChart3, Clock, MessageCircle, Facebook, Instagram } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, Pie, PieChart, Legend } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessagesChart } from "@/features/dashboard/components/messages-chart";
import { useDashboardAnalytics } from "@/features/dashboard/hooks/use-dashboard-analytics";
import { CrmReportsPanel } from "@/features/crm/components/crm-reports-panel";

const channelMeta = {
  WHATSAPP: { label: "واتساب", icon: MessageCircle, color: "oklch(0.7 0.14 150)" },
  FACEBOOK: { label: "فيسبوك", icon: Facebook, color: "oklch(0.55 0.18 262)" },
  INSTAGRAM: { label: "إنستجرام", icon: Instagram, color: "oklch(0.6 0.2 340)" },
};

const confidenceMeta = {
  HIGH: { label: "ثقة عالية", color: "oklch(0.7 0.14 150)" },
  MEDIUM: { label: "ثقة متوسطة", color: "oklch(0.75 0.15 90)" },
  LOW: { label: "معلومة غير متاحة", color: "oklch(0.58 0.22 27)" },
};

export default function AnalyticsPage() {
  const { data, isLoading } = useDashboardAnalytics(14);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BarChart3 className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">تحليلات</h1>
          <p className="text-sm text-muted-foreground">أداء المساعد الذكي عبر كل القنوات</p>
        </div>
      </div>

      <Tabs defaultValue="ai" dir="rtl">
        <TabsList>
          <TabsTrigger value="ai">أداء المساعد الذكي</TabsTrigger>
          <TabsTrigger value="crm">المبيعات والعملاء</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6">
      <MessagesChart />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-base">توزيع القنوات</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-56 animate-pulse rounded-2xl bg-muted" />
            ) : !data?.channelDistribution.length ? (
              <p className="py-16 text-center text-sm text-muted-foreground">مفيش محادثات لسه</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.channelDistribution}
                      dataKey="count"
                      nameKey="channel"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {data.channelDistribution.map((entry) => (
                        <Cell key={entry.channel} fill={channelMeta[entry.channel as keyof typeof channelMeta]?.color} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value: string) => channelMeta[value as keyof typeof channelMeta]?.label ?? value}
                    />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-base">دقّة الردود (نجاح استرجاع المعرفة)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-56 animate-pulse rounded-2xl bg-muted" />
            ) : !data?.confidenceDistribution.length ? (
              <p className="py-16 text-center text-sm text-muted-foreground">مفيش ردود ذكاء اصطناعي لسه</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.confidenceDistribution} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="confidence"
                      tickFormatter={(v) => confidenceMeta[v as keyof typeof confidenceMeta]?.label ?? v}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={110}
                    />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", fontSize: 12 }} />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                      {data.confidenceDistribution.map((entry) => (
                        <Cell key={entry.confidence} fill={confidenceMeta[entry.confidence as keyof typeof confidenceMeta]?.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <CardContent className="flex items-center gap-4 py-5">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clock className="size-5" />
          </span>
          <div>
            <div className="text-sm text-muted-foreground">متوسط وقت الرد</div>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : data?.avgResponseTimeMs ? `${(data.avgResponseTimeMs / 1000).toFixed(1)} ثانية` : "لا توجد بيانات بعد"}
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="crm">
          <CrmReportsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
