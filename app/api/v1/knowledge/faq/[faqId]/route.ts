import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { knowledgeRepository } from "@/lib/repositories/knowledge.repository";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const updateSchema = z.object({
  question: z.string().min(3).max(300).optional(),
  answer: z.string().min(1).max(2000).optional(),
});

async function assertOwnership(faqId: string, workspaceId: string) {
  const faq = await prisma.knowledgeFAQ.findUnique({
    where: { id: faqId },
    include: { knowledgeBase: true },
  });
  if (!faq || faq.knowledgeBase.workspaceId !== workspaceId) return null;
  return faq;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ faqId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { faqId } = await params;

    const faq = await assertOwnership(faqId, workspace.id);
    if (!faq) return apiErrors.notFound("السؤال");

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const updated = await knowledgeRepository.updateFaq(faqId, parsed.data);
    // Note: re-embedding the edited FAQ text happens the next time the
    // knowledge base is reprocessed — see "Reprocess Files" in the UI.
    return apiSuccess(updated, "تم التحديث");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ faqId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { faqId } = await params;

    const faq = await assertOwnership(faqId, workspace.id);
    if (!faq) return apiErrors.notFound("السؤال");

    await knowledgeRepository.deleteFaq(faqId);
    return apiSuccess({ deleted: true }, "اتمسح السؤال");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
