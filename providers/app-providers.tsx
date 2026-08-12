"use client";

import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * Single composition root for every app-wide provider.
 * Phase 3 wraps this with <ClerkProvider> once auth lands.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      {children}
      <Toaster />
    </QueryProvider>
  );
}
