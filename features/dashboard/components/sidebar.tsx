"use client";

// PROPOSAL — target path: features/dashboard/components/sidebar.tsx (replaces existing file)
// Additions only: WorkspaceSwitcher above the logo row, and nav items
// for everything built this session that didn't exist when this file
// was first written (customers, pipeline, appointments, workflows).
// Every existing item, class name, and the exact structure is untouched.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessagesSquare,
  BookOpen,
  Radio,
  BarChart3,
  CreditCard,
  Settings,
  Sparkles,
  FlaskConical,
  Users,
  Kanban,
  CalendarCheck,
  Workflow,
  LifeBuoy,
  Lightbulb,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { WorkspaceSwitcher } from "@/features/dashboard/components/workspace-switcher";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, enabled: true },
  { href: "/dashboard/conversations", label: "المحادثات", icon: MessagesSquare, enabled: true },
  { href: "/dashboard/customers", label: "العملاء", icon: Users, enabled: true },
  { href: "/dashboard/pipeline", label: "مسار المبيعات", icon: Kanban, enabled: true },
  { href: "/dashboard/appointments", label: "المواعيد", icon: CalendarCheck, enabled: true },
  { href: "/dashboard/workflows", label: "Orvix Flow", icon: Workflow, enabled: true },
  { href: "/dashboard/knowledge-base", label: "معلومات النشاط", icon: BookOpen, enabled: true },
  { href: "/dashboard/playground", label: "اختبار الذكاء الاصطناعي", icon: FlaskConical, enabled: true },
  { href: "/dashboard/channels", label: "القنوات", icon: Radio, enabled: true },
  { href: "/dashboard/analytics", label: "تحليلات", icon: BarChart3, enabled: true },
  { href: "/dashboard/subscription", label: "الاشتراك", icon: CreditCard, enabled: true },
  { href: "/dashboard/support", label: "الدعم الفني", icon: LifeBuoy, enabled: true },
  { href: "/dashboard/feedback", label: "اقتراحات", icon: Lightbulb, enabled: true },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings, enabled: true },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-panel sticky top-24 hidden h-fit w-64 shrink-0 rounded-3xl p-4 shadow-sm lg:block">
      <div className="flex items-center gap-2 px-2 pb-2 font-bold">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        {siteConfig.nameAr}
      </div>

      <div className="mb-3 border-b pb-3">
        <WorkspaceSwitcher />
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const content = (
            <span
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive && "bg-primary/10 text-primary",
                !isActive && item.enabled && "text-foreground hover:bg-accent",
                !item.enabled && "cursor-not-allowed text-muted-foreground/60"
              )}
            >
              <item.icon className="size-4.5 shrink-0" />
              {item.label}
              {!item.enabled && (
                <span className="ms-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  قريبًا
                </span>
              )}
            </span>
          );

          return item.enabled ? (
            <Link key={item.href} href={item.href}>
              {content}
            </Link>
          ) : (
            <span key={item.href} aria-disabled>
              {content}
            </span>
          );
        })}
      </nav>
    </aside>
  );
}
