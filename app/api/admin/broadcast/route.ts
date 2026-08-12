import { z } from "zod";

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { broadcastService } from "@/features/admin/services/broadcast.service";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const sendSchema = z
  .object({
    title: z.string().min(2, "لازم عنوان"),
    body: z.string().min(2, "لازم نص الرسالة"),
    audience: z.enum(["ALL", "PLAN", "WORKSPACE"]),
    plan: z.enum(["FREE", "PRO"]).optional(),
    workspaceId: z.string().optional(),
    sendEmail: z.boolean().optional(),
  })
  .refine((data) => data.audience !== "PLAN" || !!data.plan, {
    message: "اختار الخطة",
    path: ["plan"],
  })
  .refine((data) => data.audience !== "WORKSPACE" || !!data.workspaceId, {
    message: "اختار النشاط",
    path: ["workspaceId"],
  });

export async function POST(request: Request) {
  try {
    const { user: admin } = await requireSuperAdmin();

    const json = await request.json();
    const parsed = sendSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().fieldErrors, 400);

    const result = await broadcastService.send({ ...parsed.data, sentByUserId: admin.id });

    if (result.sentCount === 0) {
      return apiError("مفيش أي نشاط مطابق للجمهور المختار", [], 400);
    }

    const emailNote = parsed.data.sendEmail ? ` (${result.emailsSent} إيميل)` : "";
    return apiSuccess(result, `اتبعتت الرسالة لـ ${result.sentCount} نشاط${emailNote}`);
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    console.error("POST /api/admin/broadcast failed:", error);
    return apiErrors.serverError();
  }
}
