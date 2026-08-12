import { googleCalendarProvider } from "@/lib/oauth/providers/google-calendar.provider";
import type { OAuthProvider } from "@/lib/oauth/types";
import type { OAuthProviderName } from "@prisma/client";

const REGISTRY: Record<string, OAuthProvider> = {
  GOOGLE_CALENDAR: googleCalendarProvider,
};

export function getOAuthProvider(name: string): OAuthProvider | null {
  return REGISTRY[name] ?? null;
}

export function listRegisteredOAuthProviders(): string[] {
  return Object.keys(REGISTRY);
}

// Lowercase-with-underscore in URLs (/api/v1/oauth/google_calendar/...)
// reads better than the enum's shouting-case, so routes translate at
// the edge instead of leaking the enum casing into every path.
const SLUG_TO_ENUM: Record<string, OAuthProviderName> = {
  google_calendar: "GOOGLE_CALENDAR",
};

export function slugToProviderName(slug: string): OAuthProviderName | null {
  return SLUG_TO_ENUM[slug] ?? null;
}
