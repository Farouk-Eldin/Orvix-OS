import Link from "next/link";
import {
  Building2,
  Sparkles,
  KeyRound,
  Users,
  ChevronLeft,
  Palette,
  Code2,
  Wrench,
  ListChecks,
  Bot,
  MapPin,
} from "lucide-react";

import { Card } from "@/components/ui/card";

const settingsLinks = [
  { href: "/dashboard/settings/workspace", label: "بيانات النشاط", description: "الاسم والشعار", icon: Building2 },
  { href: "/dashboard/settings/employee", label: "الموظف الذكي", description: "الشخصية وأسلوب الرد", icon: Sparkles },
  { href: "/dashboard/settings/ai", label: "مزوّد الذكاء الاصطناعي", description: "مفاتيح Gemini / Grok", icon: KeyRound },
  { href: "/dashboard/settings/team", label: "فريق العمل", description: "الأدوار والصلاحيات", icon: Users },
  { href: "/settings/employees", label: "فريق الذكاء الاصطناعي", description: "أكتر من موظف AI واحد", icon: Bot },
  { href: "/settings/services", label: "الخدمات", description: "المدة والسعر لكل خدمة", icon: ListChecks },
  { href: "/settings/resources", label: "الموظفين والموارد", description: "مين بيقدّم كل خدمة ومواعيده", icon: Wrench },
  { href: "/settings/branches", label: "الفروع", description: "لو النشاط أكتر من مكان", icon: MapPin },
  { href: "/settings/branding", label: "الهوية البصرية", description: "الألوان والدومين المخصص", icon: Palette },
  { href: "/settings/developer", label: "إعدادات المطورين", description: "API، Webhooks، التكاملات", icon: Code2 },
];

export default function SettingsHubPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">تحكّم في كل جوانب حسابك ونشاطك</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="flex items-center gap-4 rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <link.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">{link.label}</div>
                <div className="text-sm text-muted-foreground">{link.description}</div>
              </div>
              <ChevronLeft className="size-4 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
