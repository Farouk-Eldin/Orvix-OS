// PROPOSAL — target path: app/api/v1/leads/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { leadRepository } from "@/lib/repositories/lead.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const createLeadSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.string().optional(),
  interest: z.string().optional(),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const leads = await leadRepository.listForWorkspace(workspace.id);
    return apiSuccess(leads);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`leads-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createLeadSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const lead = await leadRepository.create({
      workspace: { connect: { id: workspace.id } },
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      source: parsed.data.source,
      interest: parsed.data.interest,
    });

    return apiSuccess(lead, "تمت إضافة العميل المحتمل");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/leads failed:", error);
    return apiErrors.serverError();
  }
}
