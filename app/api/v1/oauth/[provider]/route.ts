import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { oauthConnectionRepository } from "@/lib/repositories/oauth-connection.repository";
import { slugToProviderName } from "@/lib/oauth/oauth-registry";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function DELETE(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { provider: slug } = await params;

    const providerName = slugToProviderName(slug);
    if (!providerName) return apiErrors.notFound("مزوّد الخدمة");

    await oauthConnectionRepository.delete(workspace.id, providerName);
    return apiSuccess({ disconnected: true }, "تم فصل الربط");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
