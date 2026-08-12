"use client";

import { motion } from "framer-motion";

const stats = [
  { value: "10", label: "رسائل مجانية بدون بطاقة ائتمان" },
  { value: "3", label: "قنوات تواصل في مكان واحد" },
  { value: "دقائق", label: "من التسجيل لأول رد ذكي" },
  { value: "24/7", label: "تغطية كاملة بدون إجازات" },
];

export function StatsSection() {
  return (
    <section className="px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="glass-panel mx-auto grid max-w-5xl grid-cols-2 gap-8 rounded-3xl px-8 py-10 shadow-sm sm:grid-cols-4"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl font-bold text-primary sm:text-4xl">{stat.value}</div>
            <div className="mt-2 text-xs text-muted-foreground sm:text-sm">{stat.label}</div>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
