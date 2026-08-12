// PROPOSAL — target path: app/admin/page.tsx (replaces existing file)
// Only additions: CalendarCheck import, totalBookings in the interface,
// and one <StatBlock> line. Everything else — including the dark theme,
// which is deliberately kept as-is here since this is the admin panel,
// not the customer-facing dashboard — is byte-identical.

"use client";

import { Building2, Users, Wallet, MessageSquare, Sparkles, Ban, CalendarCheck } from "lucide-react";

import { useAdminStats } from "@/features/admin/hooks/use-admin";

interface AdminStats {
  overview: {
    totalWorkspaces: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    suspendedWorkspaces: number;
    revenueTodayEGP: number;
    revenueMonthEGP: number;
    totalMessages: number;
    totalAiReplies: number;
    totalStorageBytes: number;
    totalBookings: number;
  };
  aiProviders: { provider: string; enabled: boolean; workspacesUsing: number }[];
}

function StatBlock({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2 text-xs text-white/50">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminStats() as { data: AdminStats | undefined; isLoading: boolean };

  if (isLoading || !data) {
    return <div className="grid grid-cols-3 gap-4">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />)}</div>;
  }

  const { overview, aiProviders } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">نظرة عامة على المنصة</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatBlock icon={Building2} label="إجمالي الأنشطة" value={overview.totalWorkspaces} />
        <StatBlock icon={Users} label="اشتراكات فعّالة" value={overview.activeSubscriptions} />
        <StatBlock icon={Ban} label="أنشطة موقوفة" value={overview.suspendedWorkspaces} />
        <StatBlock icon={Wallet} label="إيراد النهاردة" value={`${overview.revenueTodayEGP} ج.م`} />
        <StatBlock icon={Wallet} label="إيراد الشهر" value={`${overview.revenueMonthEGP} ج.م`} />
        <StatBlock icon={MessageSquare} label="إجمالي الرسائل" value={overview.totalMessages} />
        <StatBlock icon={Sparkles} label="ردود الذكاء الاصطناعي" value={overview.totalAiReplies} />
        <StatBlock icon={Users} label="اشتراكات منتهية" value={overview.expiredSubscriptions} />
        <StatBlock icon={CalendarCheck} label="حجوزات نشطة" value={overview.totalBookings} />
        <StatBlock
          icon={Wallet}
          label="التخزين المستخدم"
          value={`${(overview.totalStorageBytes / (1024 * 1024)).toFixed(1)} MB`}
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-3 text-sm font-semibold">استخدام مزوّدي الذكاء الاصطناعي</div>
        {aiProviders.length === 0 ? (
          <p className="text-xs text-white/50">مفيش أي نشاط وصّل مزود ذكاء اصطناعي لسه</p>
        ) : (
          <div className="space-y-2">
            {aiProviders.map((p) => (
              <div key={`${p.provider}-${p.enabled}`} className="flex items-center justify-between text-sm">
                <span>{p.provider}</span>
                <span className="text-white/60">{p.workspacesUsing} نشاط</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
