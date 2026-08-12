import {
  requireWorkspace,
  requirePermission,
  UnauthorizedError,
  NoWorkspaceError,
  ForbiddenError,
} from "@/features/authentication/services/get-current-workspace";
import { knowledgeRepository } from "@/lib/repositories/knowledge.repository";
import { qdrant, collectionNameFor } from "@/lib/qdrant";
import { supabase } from "@/lib/supabase";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { fileId } = await params;

    const file = await knowledgeRepository.findFile(fileId);
    if (!file || file.knowledgeBase.workspaceId !== workspace.id) {
      return apiErrors.notFound("الملف");
    }

    const chunks = await knowledgeRepository.listChunksForFile(fileId);
    return apiSuccess({ file, chunks });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("GET /api/knowledge/files/[fileId] failed:", error);
    return apiErrors.serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { workspace } = await requirePermission("knowledge:manage");
    const { fileId } = await params;

    const file = await knowledgeRepository.findFile(fileId);
    if (!file || file.knowledgeBase.workspaceId !== workspace.id) {
      return apiErrors.notFound("الملف");
    }

    const chunks = await knowledgeRepository.listChunksForFile(fileId);
    const pointIds = chunks
      .map((c) => c.embedding?.qdrantPointId)
      .filter((id): id is string => Boolean(id));

    // Best-effort cleanup: Qdrant points + the stored object, then the DB
    // rows (cascades to chunks/embeddings/queue entries via the schema).
    if (pointIds.length > 0) {
      await qdrant
        .delete(collectionNameFor(workspace.id), { points: pointIds })
        .catch((e) => console.error("Qdrant cleanup failed:", e));
    }
    if (supabase) {
      await supabase.storage.from("knowledge-base").remove([file.storagePath]).catch(() => null);
    }

    await knowledgeRepository.deleteFile(fileId);
    await knowledgeRepository.refreshBaseStatus(file.knowledgeBaseId);

    return apiSuccess({ deleted: true }, "اتمسح الملف بنجاح");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof ForbiddenError) return apiError(error.message, [], 403);
    console.error("DELETE /api/knowledge/files/[fileId] failed:", error);
    return apiErrors.serverError();
  }
}
