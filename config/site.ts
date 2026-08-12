export const siteConfig = {
  name: "Orvix OS",
  nameAr: "Orvix OS",
  description: "منصة الذكاء الاصطناعي لأتمتة خدمة العملاء عبر واتساب وفيسبوك وإنستجرام",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "ar",
  direction: "rtl",

  freeTrial: {
    messages: 10,
    warningAt: 8,
    finalWarningAt: 9,
  },

  subscription: {
    priceEGP: 999,
    currency: "EGP",
    interval: "شهريًا",
  },

  supportedChannels: ["whatsapp", "facebook", "instagram"] as const,
  supportedAiProviders: ["gemini", "grok"] as const,
  supportedPaymentMethods: [
    "visa",
    "mastercard",
    "meeza",
    "vodafone_cash",
    "orange_cash",
    "etisalat_cash",
  ] as const,
  roles: ["owner", "admin", "member"] as const,
} as const;

export type SupportedChannel = (typeof siteConfig.supportedChannels)[number];
export type SupportedAiProvider = (typeof siteConfig.supportedAiProviders)[number];
export type SupportedPaymentMethod = (typeof siteConfig.supportedPaymentMethods)[number];
export type WorkspaceRole = (typeof siteConfig.roles)[number];
