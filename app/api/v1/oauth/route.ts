import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { oauthConnectionRepository } from "@/lib/repositories/oauth-connection.repository";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const connections = await oauthConnectionRepository.listForWorkspace(workspace.id);
    return apiSuccess({
      connections: connections.map((c) => ({ provider: c.provider, connectedAt: c.createdAt, scope: c.scope })),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
