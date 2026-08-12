// PROPOSAL — target path: features/onboarding/schemas/onboarding.schema.ts (replaces existing file)
// Only addition: referralCode, optional. Everything else — every
// label, every option list — is byte-identical to the existing file.
// This is what the updated app/api/v1/onboarding/route.ts from earlier
// this session actually needs to compile.

import { z } from "zod";

export const onboardingSchema = z.object({
  businessName: z
    .string()
    .min(2, "اسم النشاط لازم يكون حرفين على الأقل")
    .max(80, "اسم النشاط طويل جدًا"),
  businessType: z.string().min(1, "اختار نوع النشاط"),
  country: z.string().min(1, "اختار الدولة"),
  logoUrl: z.string().url("رابط الشعار غير صحيح").optional().or(z.literal("")),
  supportLanguage: z.enum(["AR", "EN", "AUTO"]),
  timezone: z.string().min(1, "اختار المنطقة الزمنية"),
  referralCode: z.string().min(1).optional(),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;

export const businessTypeOptions = [
  { value: "ecommerce", label: "تجارة إلكترونية" },
  { value: "retail", label: "تجارة تجزئة" },
  { value: "restaurant", label: "مطاعم وكافيهات" },
  { value: "clinic", label: "عيادات وخدمات طبية" },
  { value: "real_estate", label: "عقارات" },
  { value: "education", label: "تعليم وتدريب" },
  { value: "services", label: "خدمات عامة" },
  { value: "other", label: "أخرى" },
] as const;

export const countryOptions = [
  { value: "EG", label: "مصر" },
  { value: "SA", label: "السعودية" },
  { value: "AE", label: "الإمارات" },
  { value: "KW", label: "الكويت" },
  { value: "QA", label: "قطر" },
  { value: "JO", label: "الأردن" },
  { value: "OTHER", label: "دولة أخرى" },
] as const;

export const timezoneOptions = [
  { value: "Africa/Cairo", label: "القاهرة (GMT+2)" },
  { value: "Asia/Riyadh", label: "الرياض (GMT+3)" },
  { value: "Asia/Dubai", label: "دبي (GMT+4)" },
  { value: "Asia/Kuwait", label: "الكويت (GMT+3)" },
  { value: "Asia/Amman", label: "عمّان (GMT+3)" },
] as const;
