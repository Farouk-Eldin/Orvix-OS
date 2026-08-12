// PROPOSAL — target path: app/api/v1/workspaces/mine/route.ts (new file)

import {
  getCurrentUser,
  UnauthorizedError,
} from "@/features/authentication/services/get-current-workspace";
import { teamMemberRepository } from "@/lib/repositories/team-member.repository";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return apiErrors.unauthorized();

    const memberships = await teamMemberRepository.listWorkspacesForUser(user.id);

    return apiSuccess(
      memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
        active: m.workspace.id === user.workspaceId,
      }))
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
