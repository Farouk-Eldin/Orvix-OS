// PROPOSAL — target path: app/api/v1/leads/[leadId]/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { leadRepository } from "@/lib/repositories/lead.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const updateLeadSchema = z.object({
  stage: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NEGOTIATION", "WON", "LOST"]).optional(),
  nextFollowUpAt: z.string().optional(),
  probability: z.number().min(0).max(100).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { leadId } = await params;

    const { allowed } = await rateLimit(`leads-update:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const existing = await leadRepository.findByIdInWorkspace(leadId, workspace.id);
    if (!existing) return apiErrors.notFound("العميل المحتمل");

    const json = await request.json();
    const parsed = updateLeadSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    // WON goes through the transactional lead -> customer conversion,
    // not a plain field write — a "won" lead with no resulting customer
    // record would be a silent data-integrity gap.
    if (parsed.data.stage === "WON") {
      const customer = await leadRepository.convertToCustomer(leadId, workspace.id);
      return apiSuccess({ customerId: customer.id }, "تم تحويل العميل المحتمل لعميل فعلي");
    }

    const updated = await leadRepository.update(leadId, {
      ...(parsed.data.stage ? { stage: parsed.data.stage } : {}),
      ...(parsed.data.nextFollowUpAt ? { nextFollowUpAt: new Date(parsed.data.nextFollowUpAt) } : {}),
      ...(parsed.data.probability !== undefined ? { probability: parsed.data.probability } : {}),
    });

    return apiSuccess(updated, "تم التحديث");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("PATCH /api/v1/leads/[leadId] failed:", error);
    return apiErrors.serverError();
  }
}
