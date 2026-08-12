"use client";

import { RefreshCw } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";

const channelLabels: Record<string, string> = { whatsapp: "واتساب", facebook: "فيسبوك", instagram: "إنستجرام" };
const knowledgeLabels: Record<string, string> = {
  READY: "جاهزة",
  PROCESSING: "قيد التجهيز",
  FAILED: "فشلت",
  EMPTY: "لسه فاضية",
};
const subscriptionLabels: Record<string, string> = {
  TRIALING: "تجربة مجانية",
  ACTIVE: "مفعّل",
  PAST_DUE: "متأخر بالدفع",
  EXPIRED: "منتهي",
  CANCELLED: "ملغي",
};

function StatusDot({ ok }: { ok: boolean | null }) {
  return (
    <span
      className={`inline-block size-2 rounded-full ${ok === null ? "bg-muted-foreground/40" : ok ? "bg-emerald-500" : "bg-amber-500"}`}
    />
  );
}

export function SystemHealthCard() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboardSummary();

  const aiOnline = data ? Boolean(data.aiProvider) : null;
  const connectedChannels = data
    ? Object.entries(data.channels).filter(([, status]) => status === "CONNECTED")
    : [];

  return (
    <Card className="rounded-3xl shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`size-2.5 rounded-full ${aiOnline ? "bg-emerald-500" : aiOnline === false ? "bg-amber-500" : "bg-muted"}`}
          />
          <CardTitle className="text-base">
            {isLoading ? "جاري فحص الحالة..." : aiOnline ? "مساعدك الذكي جاهز" : "المساعد الذكي محتاج إعداد"}
          </CardTitle>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching} aria-label="تحديث">
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>

      <CardContent>
        {isError && (
          <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            تعذر تحميل حالة النظام
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              إعادة المحاولة
            </Button>
          </div>
        )}

        {!isError && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <div>
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <StatusDot ok={aiOnline} /> مزود الذكاء الاصطناعي
              </dt>
              <dd className="mt-1 text-sm font-medium">{data?.aiProvider?.provider ?? "لم يتم الربط"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">قاعدة المعرفة</dt>
              <dd className="mt-1 text-sm font-medium">
                {data ? knowledgeLabels[data.knowledgeBaseStatus] : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">القنوات المتصلة</dt>
              <dd className="mt-1 text-sm font-medium">
                {connectedChannels.length > 0
                  ? connectedChannels.map(([c]) => channelLabels[c]).join("، ")
                  : "لا يوجد"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">حالة الاشتراك</dt>
              <dd className="mt-1 text-sm font-medium">
                {data?.subscription ? subscriptionLabels[data.subscription.status] : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">الرسائل المتبقية</dt>
              <dd className="mt-1 text-sm font-medium">
                {data?.subscription
                  ? `${Math.max(0, data.subscription.messagesLimit - data.subscription.messagesUsed)} / ${data.subscription.messagesLimit}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">رسائل اليوم</dt>
              <dd className="mt-1 text-sm font-medium">{data?.messagesToday ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">متوسط زمن الرد</dt>
              <dd className="mt-1 text-sm font-medium">
                {data?.avgResponseTimeMs ? `${Math.round(data.avgResponseTimeMs)} مللي ثانية` : "لا توجد بيانات بعد"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">الموظف الذكي</dt>
              <dd className="mt-1 text-sm font-medium">{data?.aiEmployee?.name ?? "—"}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
