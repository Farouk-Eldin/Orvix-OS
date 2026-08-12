import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { conversationRepository } from "@/lib/repositories/conversation.repository";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWorkspace();
    const { searchParams } = new URL(request.url);

    const result = await conversationRepository.listForWorkspace({
      workspaceId: workspace.id,
      search: searchParams.get("search") ?? undefined,
      channel: (searchParams.get("channel") as "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | null) ?? undefined,
      page: Number(searchParams.get("page") ?? "1"),
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
