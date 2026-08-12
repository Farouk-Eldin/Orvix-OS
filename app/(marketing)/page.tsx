import { Hero } from "@/features/landing/components/hero";
import { StatsSection } from "@/features/landing/components/stats-section";
import { FeaturesSection } from "@/features/landing/components/features-section";
import { PricingSection } from "@/features/landing/components/pricing-section";
import { TestimonialsSection } from "@/features/landing/components/testimonials-section";
import { FaqSection } from "@/features/landing/components/faq-section";
import { CtaSection } from "@/features/landing/components/cta-section";

export default function MarketingHomePage() {
  return (
    <main>
      <Hero />
      <StatsSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}
