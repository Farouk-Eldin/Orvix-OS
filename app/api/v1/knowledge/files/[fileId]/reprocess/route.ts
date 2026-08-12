import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { knowledgeRepository } from "@/lib/repositories/knowledge.repository";
import { processKnowledgeFile } from "@/features/knowledge-base/services/file-processing.service";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { fileId } = await params;

    const { allowed } = await rateLimit(`upload:${workspace.id}`, RATE_LIMITS.upload);
    if (!allowed) return apiErrors.rateLimited();

    const file = await knowledgeRepository.findFile(fileId);
    if (!file || file.knowledgeBase.workspaceId !== workspace.id) {
      return apiErrors.notFound("الملف");
    }

    const result = await processKnowledgeFile({
      workspaceId: workspace.id,
      fileId: file.id,
      storagePath: file.storagePath,
      fileType: file.fileType,
      fileName: file.fileName,
    });

    if (!result.success) {
      return apiError(result.error ?? "فشلت إعادة المعالجة", [], 422);
    }
    return apiSuccess({ chunksCreated: result.chunksCreated }, "اتعملت المعالجة تاني بنجاح");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/knowledge/files/[fileId]/reprocess failed:", error);
    return apiErrors.serverError();
  }
}
