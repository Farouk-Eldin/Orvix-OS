// PROPOSAL — target path: app/api/public/v1/customers/route.ts (new file)
// Distinct from /api/v1/* (Clerk session, dashboard-only) — this path is
// for external callers authenticating with an API key. One real
// endpoint here proves the key system actually gates something, rather
// than existing in isolation with nothing to protect yet.

import { verifyApiKey } from "@/lib/api-keys/api-key";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rawKey = request.headers.get("Authorization")?.replace("Bearer ", "") ?? null;
  const auth = await verifyApiKey(rawKey);
  if (!auth) return apiError("مفتاح غير صحيح أو منتهي", [], 401);

  if (!auth.permissions.includes("customers:read")) {
    return apiError("المفتاح ده مالوش صلاحية customers:read", [], 403);
  }

  const { allowed } = await rateLimit(`public-api:${auth.keyId}`, RATE_LIMITS.api);
  if (!allowed) return apiErrors.rateLimited();

  const { searchParams } = new URL(request.url);
  const result = await customerRepository.searchForWorkspace({
    workspaceId: auth.workspaceId,
    search: searchParams.get("search") ?? undefined,
    page: Number(searchParams.get("page") ?? "1"),
  });

  return apiSuccess(result);
}
