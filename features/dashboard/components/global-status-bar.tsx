"use client";

import { motion } from "framer-motion";

import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

export function GlobalStatusBar() {
  const { data } = useDashboardSummary();
  const isHidden = useScrollDirection();

  if (!data) return null;

  const remaining = data.subscription
    ? Math.max(0, data.subscription.messagesLimit - data.subscription.messagesUsed)
    : null;

  let message = "🟢 مساعدك الذكي يعمل بشكل طبيعي";
  if (data.subscription?.status === "EXPIRED") {
    message = "⚠ انتهت الفترة التجريبية، اشترك الآن للمتابعة.";
  } else if (!data.aiProvider) {
    message = "🔴 تعذر الاتصال بمزود الذكاء الاصطناعي.";
  } else if (data.knowledgeBaseStatus === "PROCESSING") {
    message = "🟡 يتم الآن تجهيز معلومات النشاط...";
  }

  const connectedCount = Object.values(data.channels).filter((s) => s === "CONNECTED").length;

  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: isHidden ? -60 : 0, opacity: isHidden ? 0 : 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="glass-panel-strong sticky top-0 z-30 mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-2xl px-4 py-2 text-xs text-muted-foreground shadow-sm"
    >
      <span className="font-medium text-foreground">{message}</span>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
        <span>المزود: {data.aiProvider?.provider ?? "—"}</span>
        <span>القنوات: {connectedCount} متصلة</span>
        <span>رسائل اليوم: {data.messagesToday}</span>
        {remaining !== null && <span>الرسائل المتبقية: {remaining}</span>}
      </div>
    </motion.div>
  );
}
