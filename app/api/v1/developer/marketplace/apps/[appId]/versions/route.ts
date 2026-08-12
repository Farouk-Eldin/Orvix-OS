// PROPOSAL — target path: app/api/v1/developer/marketplace/apps/[appId]/versions/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { marketplaceRepository } from "@/lib/repositories/marketplace.repository";
import { marketplaceService } from "@/features/marketplace/services/marketplace.service";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const submitVersionSchema = z.object({
  version: z.string().min(1).max(30),
  changelog: z.string().max(2000).optional(),
  permissions: z.array(z.string()).default([]),
  manifest: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request, { params }: { params: Promise<{ appId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { appId } = await params;

    const app = await marketplaceRepository.findAppById(appId);
    if (!app || app.developerWorkspaceId !== workspace.id) return apiErrors.notFound("التطبيق");

    const { allowed } = await rateLimit(`marketplace-version-submit:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = submitVersionSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    const version = await marketplaceService.submitVersion({ appId, ...parsed.data });

    return apiSuccess(
      version,
      version.status === "APPROVED" ? "اتوافق عليها تلقائيًا ونُشرت" : "اتبعتت للمراجعة اليدوية"
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return apiError("رقم النسخة ده اتقدّم قبل كده لنفس التطبيق", [], 409);
    }
    console.error("POST .../marketplace/apps/[appId]/versions failed:", error);
    return apiErrors.serverError();
  }
}
