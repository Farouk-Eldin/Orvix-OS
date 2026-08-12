import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { knowledgeRepository } from "@/lib/repositories/knowledge.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const faqSchema = z.object({
  question: z.string().min(3, "السؤال قصير جدًا").max(300),
  answer: z.string().min(1, "الإجابة مطلوبة").max(2000),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const base = await knowledgeRepository.findBaseForWorkspace(workspace.id);
    const faqs = await knowledgeRepository.listFaqs(base.id);
    return apiSuccess(faqs);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();
    const json = await request.json();
    const parsed = faqSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const base = await knowledgeRepository.findBaseForWorkspace(workspace.id);
    const faq = await knowledgeRepository.createFaq({
      knowledgeBase: { connect: { id: base.id } },
      question: parsed.data.question,
      answer: parsed.data.answer,
    });

    // FAQs feed the same retrieval index as files so the AI can answer from them too.
    const { processKnowledgeFile } = await import("@/features/knowledge-base/services/file-processing.service");
    const { supabase } = await import("@/lib/supabase");
    if (supabase) {
      const storagePath = `${workspace.id}/faq-${faq.id}.txt`;
      const content = `سؤال: ${parsed.data.question}\nإجابة: ${parsed.data.answer}`;
      await supabase.storage.from("knowledge-base").upload(storagePath, content, {
        contentType: "text/plain",
        upsert: true,
      });
      const file = await knowledgeRepository.createFile({
        knowledgeBase: { connect: { id: base.id } },
        fileName: `FAQ: ${parsed.data.question.slice(0, 40)}`,
        fileType: "MANUAL",
        fileSize: content.length,
        storagePath,
        processingStatus: "PENDING",
        uploader: { connect: { id: (await requireWorkspace()).user.id } },
      });
      await processKnowledgeFile({
        workspaceId: workspace.id,
        fileId: file.id,
        storagePath,
        fileType: "MANUAL",
        fileName: file.fileName,
      });
    }

    return apiSuccess(faq, "تمت إضافة السؤال");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/knowledge/faq failed:", error);
    return apiErrors.serverError();
  }
}
