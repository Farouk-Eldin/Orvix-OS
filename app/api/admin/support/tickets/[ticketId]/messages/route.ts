import { z } from "zod";

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { supportTicketService, TicketNotFoundError } from "@/features/support/services/support-ticket.service";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const replySchema = z.object({
  body: z.string().min(1, "اكتب ردّك الأول"),
  isInternalNote: z.boolean().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { user } = await requireSuperAdmin();
    const { ticketId } = await params;

    const json = await request.json();
    const parsed = replySchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    const message = await supportTicketService.replyAsAdmin({
      ticketId,
      adminUserId: user.id,
      body: parsed.data.body,
      isInternalNote: parsed.data.isInternalNote,
    });

    return apiSuccess(message, parsed.data.isInternalNote ? "تم حفظ الملاحظة الداخلية" : "تم إرسال الرد");
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    if (error instanceof TicketNotFoundError) return apiErrors.notFound("التذكرة");
    return apiErrors.serverError();
  }
}
