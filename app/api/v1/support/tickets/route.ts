import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { supportTicketService } from "@/features/support/services/support-ticket.service";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const createTicketSchema = z.object({
  subject: z.string().min(3, "الموضوع لازم يكون 3 حروف على الأقل").max(200),
  body: z.string().min(5, "وضّح المشكلة في سطرين على الأقل"),
  category: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const tickets = await supportTicketService.listForWorkspace(workspace.id);
    return apiSuccess(tickets);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { user, workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`support-ticket-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createTicketSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const ticket = await supportTicketService.createTicket({
      workspaceId: workspace.id,
      userId: user.id,
      subject: parsed.data.subject,
      body: parsed.data.body,
      category: parsed.data.category,
      priority: parsed.data.priority,
    });

    return apiSuccess(ticket, "تم إرسال التذكرة، هنرد عليك في أقرب وقت");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/support/tickets failed:", error);
    return apiErrors.serverError();
  }
}
