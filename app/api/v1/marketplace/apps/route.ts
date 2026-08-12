// PROPOSAL — target path: app/api/v1/marketplace/apps/route.ts (new file)
// Workspace-facing: browse what's published, install for your own workspace.

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { marketplaceRepository } from "@/lib/repositories/marketplace.repository";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    await requireWorkspace();
    const { searchParams } = new URL(request.url);
    const apps = await marketplaceRepository.listPublished(searchParams.get("type") ?? undefined);
    return apiSuccess(apps);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
