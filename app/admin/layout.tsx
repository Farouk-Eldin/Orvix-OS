import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  LayoutGrid,
  Building2,
  CreditCard,
  Activity,
  LifeBuoy,
  Megaphone,
  Store,
  SlidersHorizontal,
  ScrollText,
  Flag,
  BellRing,
  Layers,
  HardDrive,
  Lightbulb,
} from "lucide-react";

import { getCurrentUser } from "@/features/authentication/services/get-current-workspace";

const navItems = [
  { href: "/admin", label: "نظرة عامة", icon: LayoutGrid },
  { href: "/admin/workspaces", label: "الأنشطة", icon: Building2 },
  { href: "/admin/payments", label: "المدفوعات", icon: CreditCard },
  { href: "/admin/support", label: "الدعم الفني", icon: LifeBuoy },
  { href: "/admin/audit-logs", label: "سجل النشاط", icon: ScrollText },
  { href: "/admin/feature-flags", label: "مفاتيح المزايا", icon: Flag },
  { href: "/admin/broadcast", label: "إشعار جماعي", icon: BellRing },
  { href: "/admin/feedback", label: "الاقتراحات", icon: Lightbulb },
  { href: "/admin/marketers", label: "المسوّقين", icon: Megaphone },
  { href: "/admin/marketplace/reviews", label: "الماركت بليس", icon: Store },
  { href: "/admin/queues", label: "مراقبة الطوابير", icon: Layers },
  { href: "/admin/storage", label: "التخزين", icon: HardDrive },
  { href: "/admin/settings/platform", label: "إعدادات المنصة", icon: SlidersHorizontal },
  { href: "/admin/system", label: "حالة النظام", icon: Activity },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (!user.isSuperAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[oklch(0.13_0.01_264)] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="flex items-center gap-2 font-bold">
          <ShieldCheck className="size-5 text-emerald-400" />
          Orvix OS — لوحة الأدمن
        </div>
        <Link href="/dashboard" className="text-xs text-white/60 hover:text-white">
          رجوع للوحة العادية
        </Link>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 p-6">
        <nav className="w-48 shrink-0 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
