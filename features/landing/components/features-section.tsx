"use client";

import { motion } from "framer-motion";
import { BrainCircuit, MessagesSquare, ShieldCheck, Languages, BarChart3, FileStack } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: BrainCircuit,
    title: "يتعلّم من بيانات نشاطك",
    description: "ارفع ملفات PDF أو نصوص أو اكتب معلومات يدويًا، والذكاء الاصطناعي يرد بناءً عليها فقط — بدون تخمين.",
  },
  {
    icon: MessagesSquare,
    title: "واتساب، فيسبوك، إنستجرام",
    description: "قناة واحدة لإدارة كل محادثاتك، مع رد تلقائي وفوري على كل قناة من غير تدخل بشري.",
  },
  {
    icon: Languages,
    title: "عربي أولًا",
    description: "يفهم اللهجات العربية المختلفة ويرد بنفس لغة العميل تلقائيًا، عربي أو إنجليزي.",
  },
  {
    icon: ShieldCheck,
    title: "بيانات معزولة وآمنة",
    description: "بيانات كل نشاط تجاري معزولة تمامًا، مع تشفير كامل للمفاتيح والاتصالات الحساسة.",
  },
  {
    icon: BarChart3,
    title: "تحليلات لحظية",
    description: "تابع عدد الرسائل، دقة الردود، ومتوسط وقت الاستجابة من لوحة تحكم واحدة.",
  },
  {
    icon: FileStack,
    title: "بدون هلوسة",
    description: "لو المعلومة مش موجودة في قاعدة المعرفة، المساعد يعتذر بأدب بدل ما يخترع إجابة.",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">كل حاجة محتاجها عشان توقف رد يدوي</h2>
          <p className="mt-4 text-muted-foreground">مصمم عشان يبقى موظف خدمة عملاء حقيقي، مش شات بوت بسيط.</p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={container}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={item}>
              <Card className="h-full rounded-3xl transition-transform hover:-translate-y-1">
                <CardHeader>
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <feature.icon className="size-5" />
                  </span>
                  <CardTitle className="pt-2 text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
