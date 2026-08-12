// PROPOSAL — target path: app/api/v1/customers/route.ts (new file)

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { workspace } = await requireWorkspace();
    const { searchParams } = new URL(request.url);

    const result = await customerRepository.searchForWorkspace({
      workspaceId: workspace.id,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: Number(searchParams.get("page") ?? "1"),
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
