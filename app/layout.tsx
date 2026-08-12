import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { arSA } from "@clerk/localizations";

import { cairo, inter } from "@/styles/fonts";
import { AppProviders } from "@/providers/app-providers";
import { siteConfig } from "@/config/site";

import "./globals.css";

export const metadata: Metadata = {
  title: siteConfig.nameAr,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={arSA}
      appearance={{
        variables: {
          colorPrimary: "#4F46E5",
          colorBackground: "#ffffff",
          borderRadius: "1rem",
        },
        elements: {
          card: "shadow-xl border border-border backdrop-blur-xl",
        },
      }}
    >
      <html lang="ar" dir="rtl" className={`${cairo.variable} ${inter.variable}`}>
        <body className="min-h-screen bg-background font-sans antialiased">
          <AppProviders>{children}</AppProviders>
        </body>
      </html>
    </ClerkProvider>
  );
}
