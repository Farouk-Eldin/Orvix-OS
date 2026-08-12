import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { conversationRepository } from "@/lib/repositories/conversation.repository";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { conversationId } = await params;

    const conversation = await conversationRepository.getFullDetail(conversationId);
    if (!conversation || conversation.workspaceId !== workspace.id) {
      return apiErrors.notFound("المحادثة");
    }

    return apiSuccess(conversation);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
