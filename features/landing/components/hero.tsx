"use client";

import { motion } from "framer-motion";
import { MessageCircle, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-40 sm:pt-48">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,var(--color-primary)/14%,transparent_55%)]"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        <div className="text-center lg:text-start">
          <motion.span
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary"
          >
            <Sparkles className="size-3.5" />
            موظف خدمة عملاء بالذكاء الاصطناعي، متاح 24/7
          </motion.span>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
          >
            خلّي الذكاء الاصطناعي
            <br />
            <span className="bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
              يرد على عملائك بدالك
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground lg:mx-0"
          >
            وصّل واتساب وفيسبوك وإنستجرام، ارفع بيانات نشاطك، وخلّي الذكاء الاصطناعي يرد على كل استفسار
            فورًا وبدقة — من غير ما تحتاج فريق دعم بشري.
          </motion.p>

          <motion.div
            custom={3}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Button size="lg" asChild>
              <a href="/sign-up">ابدأ مجانًا — 10 رسائل هدية</a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#pricing">شوف الأسعار</a>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="relative mx-auto aspect-square w-full max-w-md"
        >
          <div className="absolute inset-8 rounded-full bg-primary/20 blur-3xl" />

          <div className="glass-panel-strong relative flex h-full flex-col justify-between rounded-[2.5rem] p-6 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-medium text-muted-foreground">المساعد الذكي · متصل الآن</span>
            </div>

            <div className="space-y-3">
              <div className="glass-panel ms-auto max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm">
                إيه أسعار الشحن للقاهرة؟
              </div>
              <div className="me-auto flex max-w-[80%] items-start gap-2">
                <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="size-3.5" />
                </span>
                <div className="glass-panel rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                  الشحن للقاهرة 50 جنيه ويوصل خلال يومين، وبيبقى مجاني فوق 1000 جنيه 🚚
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border bg-background/50 px-4 py-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="size-3.5 text-primary" /> الرد خلال ثوانٍ
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="size-3.5 text-primary" /> واتساب
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
