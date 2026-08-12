import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { knowledgeRepository } from "@/lib/repositories/knowledge.repository";
import { processKnowledgeFile } from "@/features/knowledge-base/services/file-processing.service";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const manualSchema = z.object({
  title: z.string().min(2, "العنوان قصير جدًا").max(120),
  content: z.string().min(20, "النص قصير جدًا عشان يبقى مفيد").max(200_000),
});

export async function POST(request: Request) {
  try {
    const { workspace, user } = await requireWorkspace();

    const { allowed } = await rateLimit(`upload:${workspace.id}`, RATE_LIMITS.upload);
    if (!allowed) return apiErrors.rateLimited();

    if (!supabase) {
      return apiError("Supabase Storage غير متصل", [], 503);
    }

    const json = await request.json();
    const parsed = manualSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const base = await knowledgeRepository.findBaseForWorkspace(workspace.id);
    const storagePath = `${workspace.id}/manual-${Date.now()}.txt`;

    const { error: uploadError } = await supabase.storage
      .from("knowledge-base")
      .upload(storagePath, parsed.data.content, { contentType: "text/plain", upsert: false });
    if (uploadError) {
      return apiError("فشل حفظ النص", [uploadError.message], 502);
    }

    const file = await knowledgeRepository.createFile({
      knowledgeBase: { connect: { id: base.id } },
      fileName: parsed.data.title,
      fileType: "MANUAL",
      fileSize: parsed.data.content.length,
      storagePath,
      processingStatus: "PENDING",
      uploader: { connect: { id: user.id } },
    });

    const result = await processKnowledgeFile({
      workspaceId: workspace.id,
      fileId: file.id,
      storagePath,
      fileType: "MANUAL",
      fileName: parsed.data.title,
    });

    if (!result.success) {
      return apiError(result.error ?? "فشلت معالجة النص", [], 422);
    }

    return apiSuccess({ fileId: file.id, chunksCreated: result.chunksCreated }, "تمت إضافة المعلومة");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/knowledge/manual failed:", error);
    return apiErrors.serverError();
  }
}
