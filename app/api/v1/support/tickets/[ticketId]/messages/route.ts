import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { supportTicketService, TicketNotFoundError } from "@/features/support/services/support-ticket.service";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const replySchema = z.object({ body: z.string().min(1, "اكتب ردّك الأول") });

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { user, workspace } = await requireWorkspace();
    const { ticketId } = await params;

    const { allowed } = await rateLimit(`support-ticket-reply:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = replySchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    const message = await supportTicketService.replyAsWorkspace({
      ticketId,
      workspaceId: workspace.id,
      userId: user.id,
      body: parsed.data.body,
    });

    return apiSuccess(message, "تم إرسال الرد");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof TicketNotFoundError) return apiErrors.notFound("التذكرة");
    console.error("POST /api/v1/support/tickets/[ticketId]/messages failed:", error);
    return apiErrors.serverError();
  }
}
