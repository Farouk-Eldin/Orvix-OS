import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

// Everything under (app) requires a signed-in user. Sign-in/up, the
// marketing site, and webhook receivers stay public.
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/onboarding(.*)",
  "/admin(.*)",
  "/api/((?!webhooks).*)",
]);

// The admin panel, its API, auth pages, and incoming provider webhooks
// must never be blocked by maintenance mode — otherwise turning it on
// could lock the admin out of the one place that turns it back off, or
// silently drop a real WhatsApp/Paymob webhook mid-incident.
const MAINTENANCE_BYPASS_PREFIXES = [
  "/admin",
  "/api/admin",
  "/api/webhooks",
  "/api/v1/system/health",
  "/sign-in",
  "/sign-up",
  "/maintenance",
];

interface MaintenanceValue {
  enabled?: boolean;
  message?: string;
  estimatedTime?: string;
}

// A short in-memory cache, not a fetch on every single request — proxy.ts
// runs on Node.js now, but a database round trip on every request is
// still wasteful for a value that changes maybe a few times a year.
// Worst case, toggling maintenance mode takes up to 10s to fully apply.
let maintenanceCache: { value: MaintenanceValue | null; expiresAt: number } | null = null;

async function getMaintenanceMode(): Promise<MaintenanceValue | null> {
  if (maintenanceCache && maintenanceCache.expiresAt > Date.now()) {
    return maintenanceCache.value;
  }
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: "maintenance_mode" } });
    const value = (row?.value as MaintenanceValue | undefined) ?? null;
    maintenanceCache = { value, expiresAt: Date.now() + 10_000 };
    return value;
  } catch {
    // A failed DB check must never be what takes the whole platform down —
    // fail open (treat it as "not in maintenance") rather than block everyone.
    return null;
  }
}

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  const { pathname } = req.nextUrl;
  if (MAINTENANCE_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return;
  }

  const maintenance = await getMaintenanceMode();
  if (!maintenance?.enabled) return;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        success: false,
        message: maintenance.message || "المنصة تحت الصيانة حاليًا، هنرجع قريب.",
        data: null,
        errors: [],
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  const url = new URL("/maintenance", req.url);
  if (maintenance.message) url.searchParams.set("message", maintenance.message);
  if (maintenance.estimatedTime) url.searchParams.set("eta", maintenance.estimatedTime);
  return NextResponse.rewrite(url);
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
