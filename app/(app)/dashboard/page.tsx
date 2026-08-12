"use client";

import { Users, MessagesSquare, Sparkles, FileText, HelpCircle, Radio } from "lucide-react";

import { StatCard } from "@/features/dashboard/components/stat-card";
import { SystemHealthCard } from "@/features/dashboard/components/system-health-card";
import { MessagesChart } from "@/features/dashboard/components/messages-chart";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { RecentActivity } from "@/features/dashboard/components/recent-activity";
import { TrialUsageBanner } from "@/features/dashboard/components/trial-usage-banner";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";

export default function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();

  const connectedChannels = data ? Object.values(data.channels).filter((s) => s === "CONNECTED").length : 0;

  return (
    <div className="space-y-6">
      <TrialUsageBanner />
      <SystemHealthCard />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="عدد العملاء" value={data?.customersCount ?? 0} icon={Users} isLoading={isLoading} />
        <StatCard label="عدد الرسائل" value={data?.messagesCount ?? 0} icon={MessagesSquare} isLoading={isLoading} />
        <StatCard label="ردود الذكاء الاصطناعي" value={data?.aiRepliesCount ?? 0} icon={Sparkles} isLoading={isLoading} />
        <StatCard label="القنوات المتصلة" value={`${connectedChannels} / 3`} icon={Radio} isLoading={isLoading} />
        <StatCard label="عدد الملفات" value={data?.filesCount ?? 0} icon={FileText} isLoading={isLoading} />
        <StatCard label="الأسئلة الشائعة" value={data?.faqsCount ?? 0} icon={HelpCircle} isLoading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <MessagesChart />
        </div>
        <RecentActivity />
      </div>

      <QuickActions />
    </div>
  );
}
