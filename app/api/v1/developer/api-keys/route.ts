// PROPOSAL — target path: app/api/v1/developer/api-keys/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-keys/api-key";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const PERMISSION_VALUES = [
  "customers:read",
  "customers:write",
  "bookings:read",
  "bookings:write",
] as const;

const createKeySchema = z.object({
  name: z.string().min(1),
  permissions: z.array(z.enum(PERMISSION_VALUES)).min(1),
  expiresInDays: z.number().int().positive().optional(),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    // keyPrefix only — the actual key material never comes back from the database.
    const keys = await prisma.apiKey.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, keyPrefix: true, permissions: true, lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(keys);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`api-keys-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createKeySchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const { fullKey, keyPrefix, hashedKey } = generateApiKey();

    const record = await prisma.apiKey.create({
      data: {
        workspace: { connect: { id: workspace.id } },
        name: parsed.data.name,
        keyPrefix,
        hashedKey,
        permissions: parsed.data.permissions,
        expiresAt: parsed.data.expiresInDays
          ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    // fullKey appears in this one response only — displayed, then gone.
    return apiSuccess({ id: record.id, fullKey, keyPrefix }, "احفظ المفتاح ده دلوقتي — مش هيتعرض تاني");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/developer/api-keys failed:", error);
    return apiErrors.serverError();
  }
}
