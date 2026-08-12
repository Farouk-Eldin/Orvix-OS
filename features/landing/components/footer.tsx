import { Sparkles } from "lucide-react";

import { siteConfig } from "@/config/site";

const columns = [
  {
    title: "المنتج",
    links: [
      { label: "المميزات", href: "#features" },
      { label: "الأسعار", href: "#pricing" },
      { label: "الأسئلة الشائعة", href: "#faq" },
    ],
  },
  {
    title: "الشركة",
    links: [
      { label: "من نحن", href: "#" },
      { label: "تواصل معنا", href: "#" },
    ],
  },
  {
    title: "قانوني",
    links: [
      { label: "سياسة الخصوصية", href: "#" },
      { label: "الشروط والأحكام", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-bold">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Sparkles className="size-4" />
              </span>
              {siteConfig.nameAr}
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              منصة الذكاء الاصطناعي لأتمتة خدمة العملاء عبر واتساب وفيسبوك وإنستجرام.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <div className="text-sm font-semibold">{column.title}</div>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.nameAr}. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
