import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// PROPOSAL — target path: app/api/v1/customers/[customerId]/notes/route.ts (new file)
// FIXED: requireWorkspace() already returns { user, workspace } — no
// separate Clerk auth() call needed, and definitely not the raw Clerk
// userId (that's User.clerkId, a different field from User.id, which is
// what the CustomerNote.authorId relation actually points to).

const createNoteSchema = z.object({
  content: z.string().min(1, "المحتوى مطلوب"),
  visibility: z.enum(["PRIVATE", "INTERNAL"]).default("INTERNAL"),
});

export async function POST(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  try {
    const { user, workspace } = await requireWorkspace();
    const { customerId } = await params;

    const { allowed } = await rateLimit(`notes-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createNoteSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const note = await customerRepository.createNote({
      workspace: { connect: { id: workspace.id } },
      customer: { connect: { id: customerId } },
      author: { connect: { id: user.id } },
      content: parsed.data.content,
      visibility: parsed.data.visibility,
    });

    return apiSuccess(note, "تمت إضافة الملاحظة");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/customers/[customerId]/notes failed:", error);
    return apiErrors.serverError();
  }
}
