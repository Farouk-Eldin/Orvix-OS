"use client";

import { motion } from "framer-motion";

// Placeholder testimonials — swap for real customer quotes before launch.
// Deliberately using initials avatars instead of stock photography: real
// photos of named "customers" that aren't real would be misleading.
const testimonials = [
  {
    name: "أحمد سامي",
    role: "صاحب متجر إلكتروني",
    quote: "بقيت أرد على عملايا في نص الوقت اللي كنت بستخدمه قبل كده، وده كان بيوفرلي فريق كامل.",
  },
  {
    name: "منى الشريف",
    role: "عيادة أسنان",
    quote: "المرضى بقوا يلاقوا رد فوري على استفساراتهم حتى بره أوقات العيادة.",
  },
  {
    name: "كريم عادل",
    role: "مطعم توصيل",
    quote: "أسئلة زي المنيو والمواعيد بقت بترد نفسها، وأنا بركز بس على الطلبات.",
  },
];

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("");
}

export function TestimonialsSection() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">أصحاب أنشطة بيثقوا فينا</h2>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass-panel rounded-3xl p-6 shadow-sm"
            >
              <p className="text-sm leading-relaxed text-foreground">“{testimonial.quote}”</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials(testimonial.name)}
                </span>
                <div>
                  <div className="text-sm font-medium">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
