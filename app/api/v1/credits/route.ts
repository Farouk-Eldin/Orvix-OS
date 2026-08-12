// PROPOSAL — target path: app/api/v1/credits/route.ts (new file)

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { creditsService } from "@/features/billing/services/credits.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const [balance, history] = await Promise.all([
      creditsService.getBalance(workspace.id),
      creditsService.history(workspace.id),
    ]);
    return apiSuccess({ balance, history });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
