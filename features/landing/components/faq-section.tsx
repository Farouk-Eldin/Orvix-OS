"use client";

import { motion } from "framer-motion";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "هل محتاج فريق دعم فني عشان أشغّل المنصة؟",
    answer: "لأ، التسجيل والإعداد بيتم في دقائق. بترفع بيانات نشاطك وتوصّل قنواتك والمساعد الذكي يبدأ يشتغل فورًا.",
  },
  {
    question: "إيه اللي بيحصل لو المعلومة مش موجودة في قاعدة المعرفة؟",
    answer: "المساعد الذكي بيعتذر بأدب ويقولك إن المعلومة مش متاحة، بدل ما يخترع إجابة غلط.",
  },
  {
    question: "هل فيه تحويل للمحادثة لموظف بشري؟",
    answer: "لأ، المنصة مصممة عشان الذكاء الاصطناعي يرد على كل الاستفسارات تلقائيًا بدون تدخل بشري.",
  },
  {
    question: "إيه وسائل الدفع المتاحة؟",
    answer: "فيزا، ماستركارد، ميزة، فودافون كاش، أورنج كاش، واتصالات كاش.",
  },
  {
    question: "هل بياناتي محمية؟",
    answer: "بيانات كل نشاط تجاري معزولة تمامًا عن باقي الحسابات، مع تشفير كامل للمفاتيح الحساسة.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="px-6 py-24">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">أسئلة شائعة</h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-10"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem key={faq.question} value={`item-${index}`}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
