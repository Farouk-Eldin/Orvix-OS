// PROPOSAL — target path: app/api/public/v1/referral-check/route.ts (new file)
// Public on purpose — the signup form calls this before the person even
// has an account, to show "you've been invited" per the doc's UX spec.
// No account data is exposed, just a boolean.

import { prisma } from "@/lib/prisma";
import { apiSuccess } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  const { allowed } = await rateLimit(`referral-check:${request.headers.get("x-forwarded-for") ?? "anon"}`, RATE_LIMITS.api);
  if (!allowed) return apiSuccess({ valid: false });

  if (!code) return apiSuccess({ valid: false });

  const marketer = await prisma.marketer.findFirst({
    where: { referralCode: code, status: "ACTIVE" },
    select: { name: true },
  });

  return apiSuccess({ valid: !!marketer });
}
