"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const includedFeatures = [
  "ردود ذكاء اصطناعي غير محدودة",
  "ربط واتساب وفيسبوك وإنستجرام",
  "قاعدة معرفة كاملة (PDF, TXT, نص يدوي)",
  "لوحة تحليلات وتقارير",
  "دعم فني عبر البريد الإلكتروني",
];

export function PricingSection() {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">خطة واحدة بسيطة</h2>
        <p className="mt-4 text-muted-foreground">جرّب مجانًا الأول، واشترك لما تتأكد إنه مناسب لنشاطك.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto mt-12 max-w-md"
      >
        <Card className="rounded-3xl border-primary/30 shadow-xl">
          <CardHeader className="items-center gap-2 text-center">
            <span className="rounded-full bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
              الأكثر شيوعًا
            </span>
            <CardTitle className="text-2xl">الاشتراك الشهري</CardTitle>
            <CardDescription>يشمل كل الميزات، بدون حدود مخفية</CardDescription>
            <div className="pt-4">
              <span className="text-5xl font-bold">999</span>
              <span className="ms-1 text-muted-foreground">جنيه / شهريًا</span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <ul className="space-y-3">
              {includedFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="size-3.5" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>

            <Button size="lg" className="w-full" asChild>
              <a href="/sign-up">ابدأ بـ 10 رسائل مجانية</a>
            </Button>
            <p className="text-center text-xs text-muted-foreground">بدون بطاقة ائتمان في التجربة المجانية</p>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
