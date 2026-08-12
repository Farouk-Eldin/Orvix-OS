import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { promptVersionService } from "@/features/ai/services/prompt-version.service";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

// PROPOSAL — target path: app/api/v1/ai/employee/route.ts (replaces existing file)
// FINAL consolidated version — supersedes the earlier isDefault-lookup
// edit from the multi-employee milestone. New in this pass: every PATCH
// now records a PromptVersion snapshot of the resulting state, per the
// doc's "Every prompt modification must create a new version" spec.
// GET and the request/response contract are otherwise unchanged.

const updateSchema = z.object({
  name: z.string().min(1).max(50),
  personality: z.enum(["PROFESSIONAL", "FRIENDLY", "LUXURY", "MEDICAL", "SALES", "SUPPORT", "MINIMAL"]),
  tone: z.string().min(1).max(100),
  language: z.enum(["AR", "EN", "AUTO"]),
  replyLength: z.enum(["SHORT", "DETAILED"]),
  emojiUsage: z.boolean(),
  welcomeMessage: z.string().min(1).max(500),
  businessDescription: z.string().min(1).max(1000),
  systemInstructions: z.string().min(1).max(3000),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const employee = await prisma.aIEmployee.findFirst({ where: { workspaceId: workspace.id, isDefault: true } });
    if (!employee) return apiErrors.notFound("الموظف الذكي");
    return apiSuccess(employee);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, workspace } = await requireWorkspace();
    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const existing = await prisma.aIEmployee.findFirst({ where: { workspaceId: workspace.id, isDefault: true } });
    if (!existing) return apiErrors.notFound("الموظف الذكي");

    const updated = await prisma.aIEmployee.update({
      where: { id: existing.id },
      data: parsed.data,
    });

    // Fire-and-forget on purpose: a version-history write failing must
    // never block the actual settings save the person is waiting on.
    promptVersionService
      .recordVersion(
        existing.id,
        {
          personality: updated.personality,
          tone: updated.tone,
          language: updated.language,
          replyLength: updated.replyLength,
          emojiUsage: updated.emojiUsage,
          welcomeMessage: updated.welcomeMessage,
          businessDescription: updated.businessDescription,
          systemInstructions: updated.systemInstructions,
        },
        user.id
      )
      .catch((error) => console.error(`[prompt-version] failed to record version for employee ${existing.id}:`, error));

    return apiSuccess(updated, "تم حفظ إعدادات الموظف الذكي");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("PATCH /api/v1/ai/employee failed:", error);
    return apiErrors.serverError();
  }
}
