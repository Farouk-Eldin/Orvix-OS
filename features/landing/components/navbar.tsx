"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { siteConfig } from "@/config/site";

const navLinks = [
  { href: "#features", label: "المميزات" },
  { href: "#pricing", label: "الأسعار" },
  { href: "#faq", label: "الأسئلة الشائعة" },
];

export function Navbar() {
  const isHidden = useScrollDirection();

  return (
    <AnimatePresence>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: isHidden ? -100 : 16, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-panel-strong fixed inset-x-4 top-0 z-50 mx-auto flex max-w-4xl items-center justify-between rounded-full px-4 py-2.5 shadow-lg sm:px-6"
      >
        <a href="/" className="flex items-center gap-2 font-bold">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span>{siteConfig.nameAr}</span>
        </a>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="/sign-in">دخول</a>
          </Button>
          <Button size="sm" asChild>
            <a href="/sign-up">ابدأ مجانًا</a>
          </Button>
        </div>
      </motion.header>
    </AnimatePresence>
  );
}
