"use client";

import { CalendarClock, Check, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscription, useStartCheckout } from "@/features/subscription/hooks/use-subscription";

const statusLabels: Record<string, string> = {
  TRIALING: "تجربة مجانية",
  ACTIVE: "مفعّل",
  PAST_DUE: "متأخر بالدفع",
  EXPIRED: "منتهي",
  CANCELLED: "ملغي",
};

const includedFeatures = [
  "ردود ذكاء اصطناعي غير محدودة",
  "ربط واتساب وفيسبوك وإنستجرام",
  "قاعدة معرفة كاملة",
  "لوحة تحليلات وتقارير",
];

export default function SubscriptionPage() {
  const { data: subscription, isLoading } = useSubscription();
  const startCheckout = useStartCheckout();

  const remaining = subscription ? Math.max(0, subscription.messagesLimit - subscription.messagesUsed) : 0;
  const percent = subscription ? Math.min(100, Math.round((subscription.messagesUsed / subscription.messagesLimit) * 100)) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الاشتراك والفوترة</h1>
        <p className="text-sm text-muted-foreground">تابع استخدامك الحالي وخطة اشتراكك.</p>
      </div>

      <Card className="rounded-3xl">
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>الخطة الحالية</CardTitle>
            <CardDescription>
              {isLoading ? "..." : subscription ? statusLabels[subscription.status] : "—"}
            </CardDescription>
          </div>
          <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            {subscription?.plan === "PRO" ? "مدفوع" : "مجاني"}
          </span>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">الرسائل المستخدمة</span>
              <span className="font-medium">
                {subscription?.messagesUsed ?? 0} / {subscription?.messagesLimit ?? "—"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">متبقي {remaining} رسالة</p>
          </div>

          {subscription?.renewAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="size-4" />
              تاريخ التجديد: {new Date(subscription.renewAt).toLocaleDateString("ar-EG")}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-primary/30">
        <CardHeader>
          <CardTitle>ترقية للخطة المدفوعة</CardTitle>
          <CardDescription>999 جنيه شهريًا — كل الميزات بدون حدود</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="grid gap-2 sm:grid-cols-2">
            {includedFeatures.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-primary" /> {f}
              </li>
            ))}
          </ul>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => startCheckout.mutate()}
            disabled={startCheckout.isPending || subscription?.status === "ACTIVE"}
          >
            {startCheckout.isPending && <Loader2 className="size-4 animate-spin" />}
            {subscription?.status === "ACTIVE" ? "مفعّل بالفعل" : "اشترك الآن — 999 جنيه"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
