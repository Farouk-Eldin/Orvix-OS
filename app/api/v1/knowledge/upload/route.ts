import { headers } from "next/headers";

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

// PDF parsing needs Node APIs — never runs on the edge runtime.
export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES: Record<string, "PDF" | "TXT"> = {
  "application/pdf": "PDF",
  "text/plain": "TXT",
};

export async function POST(request: Request) {
  try {
    const { workspace, user } = await requireWorkspace();

    const { allowed } = await rateLimit(`upload:${workspace.id}`, RATE_LIMITS.upload);
    if (!allowed) return apiErrors.rateLimited();

    if (!supabase) {
      return apiError("Supabase Storage غير متصل — ضيف SUPABASE_SERVICE_ROLE_KEY في .env", [], 503);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("لازم ترفق ملف", ["file مطلوب"], 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return apiError("حجم الملف أكبر من 50 ميجا", [], 413);
    }
    const fileType = ALLOWED_TYPES[file.type];
    if (!fileType) {
      return apiError("نوع الملف غير مدعوم — PDF أو TXT بس", [], 415);
    }

    const knowledgeBase = await knowledgeRepository.findBaseForWorkspace(workspace.id);
    const storagePath = `${workspace.id}/${Date.now()}-${file.name}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("knowledge-base")
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return apiError("فشل رفع الملف للتخزين", [uploadError.message], 502);
    }

    const knowledgeFile = await knowledgeRepository.createFile({
      knowledgeBase: { connect: { id: knowledgeBase.id } },
      fileName: file.name,
      fileType,
      fileSize: file.size,
      storagePath,
      processingStatus: "PENDING",
      uploader: { connect: { id: user.id } },
    });

    const result = await processKnowledgeFile({
      workspaceId: workspace.id,
      fileId: knowledgeFile.id,
      storagePath,
      fileType,
      fileName: file.name,
    });

    if (!result.success) {
      return apiError(result.error ?? "فشلت معالجة الملف", [], 422);
    }

    return apiSuccess(
      { fileId: knowledgeFile.id, chunksCreated: result.chunksCreated },
      "تم رفع الملف ومعالجته بنجاح"
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/knowledge/upload failed:", error);
    return apiErrors.serverError();
  }
}

export async function GET() {
  const ip = (await headers()).get("x-forwarded-for") ?? "local";
  const { allowed } = await rateLimit(`knowledge-list:${ip}`, RATE_LIMITS.api);
  if (!allowed) return apiErrors.rateLimited();

  try {
    const { workspace } = await requireWorkspace();
    const base = await knowledgeRepository.findBaseForWorkspace(workspace.id);
    const files = await knowledgeRepository.listFiles(base.id);
    return apiSuccess(files);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
