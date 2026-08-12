import Link from "next/link";
import { Upload, FilePlus2, FlaskConical, MessageCircle, Facebook, Instagram } from "lucide-react";

import { Card } from "@/components/ui/card";

const actions = [
  { icon: Upload, label: "رفع ملفات", href: "/dashboard/knowledge-base" },
  { icon: FilePlus2, label: "إضافة معلومات", href: "/dashboard/knowledge-base" },
  { icon: FlaskConical, label: "اختبار الذكاء الاصطناعي", href: "/dashboard/playground" },
  { icon: MessageCircle, label: "ربط واتساب", href: "/dashboard/channels" },
  { icon: Facebook, label: "ربط فيسبوك", href: "/dashboard/channels" },
  { icon: Instagram, label: "ربط إنستجرام", href: "/dashboard/channels" },
];

export function QuickActions() {
  return (
    <Card className="rounded-3xl p-5">
      <div className="mb-4 text-sm font-semibold">إجراءات سريعة</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border px-3 py-4 text-center text-xs font-medium transition-colors hover:bg-accent"
          >
            <action.icon className="size-5 text-primary" />
            {action.label}
          </Link>
        ))}
      </div>
    </Card>
  );
}
