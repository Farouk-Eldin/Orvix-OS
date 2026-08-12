// PROPOSAL — target path: app/api/admin/marketplace/reviews/[versionId]/route.ts (new file)

import { z } from "zod";

import {
  requireSuperAdmin,
  NotSuperAdminError,
} from "@/features/authentication/services/get-current-workspace";
import { marketplaceRepository } from "@/lib/repositories/marketplace.repository";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const decideSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  try {
    // requireSuperAdmin() returns { user }, matching requireWorkspace()'s
    // { user, workspace } shape (confirmed by the actual build error —
    // an earlier version of this comment wrongly assumed it returned the
    // user directly).
    const { user: admin } = await requireSuperAdmin();
    const { versionId } = await params;

    const version = await marketplaceRepository.findVersionById(versionId);
    if (!version) return apiErrors.notFound("النسخة");
    if (version.status !== "PENDING_REVIEW") {
      return apiError("النسخة دي مش في انتظار مراجعة", [], 400);
    }

    const json = await request.json();
    const parsed = decideSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", [], 400);

    const updated = await marketplaceRepository.decideVersion(
      versionId,
      parsed.data.decision,
      admin.id,
      parsed.data.notes
    );

    return apiSuccess(updated, parsed.data.decision === "APPROVED" ? "اتوافق ونُشر" : "اترفض");
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    console.error("PATCH .../marketplace/reviews/[versionId] failed:", error);
    return apiErrors.serverError();
  }
}
