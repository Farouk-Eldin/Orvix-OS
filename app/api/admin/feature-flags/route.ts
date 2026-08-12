import { z } from "zod";

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { featureRepository } from "@/lib/repositories/feature.repository";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

/**
 * Deliberately NOT every module name from the spec — only keys a real
 * code path actually checks. Listing a flag here that nothing reads
 * would be exactly the "toggle that doesn't do anything" this registry
 * exists to prevent. Add a row here only after wiring the real check.
 */
export const KNOWN_FEATURE_FLAGS = [
  {
    key: "ai_replies",
    label: "ردود المساعد الذكي",
    description: "إيقافها بيوقف كل ردود الـ AI للنشاط ده بس (المحادثات بتتخزن عادي) — بديل أهدأ من تعليق الحساب كله.",
  },
  {
    key: "booking",
    label: "الحجز عن طريق الذكاء الاصطناعي",
    description: "إيقافها بيمنع الـ AI من إنشاء أو فحص المواعيد، حتى لو الموظف نفسه مفعّل فيه canManageBookings.",
  },
  {
    key: "workflow",
    label: "تنفيذ الـ Workflows",
    description: "إيقافها بيمنع أي Workflow منشور من التنفيذ لهذا النشاط (مفيد لو Workflow معيّن بيلوب أو بيستهلك موارد).",
  },
] as const;

const patchSchema = z.object({
  workspaceId: z.string().min(1),
  key: z.enum(["ai_replies", "booking", "workflow"]),
  enabled: z.boolean(),
});

export async function GET(request: Request) {
  try {
    await requireSuperAdmin();
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return apiError("لازم تحدد النشاط", [], 400);

    const flags = await Promise.all(
      KNOWN_FEATURE_FLAGS.map(async (flag) => ({
        ...flag,
        enabled: await featureRepository.isEnabled(workspaceId, flag.key),
      }))
    );

    return apiSuccess({ flags });
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}

export async function PATCH(request: Request) {
  try {
    await requireSuperAdmin();

    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().fieldErrors, 400);

    await featureRepository.setEnabled(parsed.data.workspaceId, parsed.data.key, parsed.data.enabled);
    return apiSuccess({ saved: true }, "اتحدّث");
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
