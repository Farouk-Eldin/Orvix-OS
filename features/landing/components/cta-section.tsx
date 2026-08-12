"use client";

import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="glass-panel-strong relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] px-8 py-16 text-center shadow-xl"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,var(--color-primary)/16%,transparent_60%)]"
        />
        <h2 className="text-3xl font-bold sm:text-4xl">جاهز تدي عملاءك رد فوري 24 ساعة؟</h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          ابدأ دلوقتي بـ 10 رسائل مجانية، من غير أي بطاقة ائتمان.
        </p>
        <Button size="lg" className="mt-8" asChild>
          <a href="/sign-up">ابدأ مجانًا الآن</a>
        </Button>
      </motion.div>
    </section>
  );
}
