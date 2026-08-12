// PROPOSAL — target path: app/api/v1/ai/employees/[employeeId]/versions/route.ts (new file)

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { promptVersionService } from "@/features/ai/services/prompt-version.service";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { employeeId } = await params;

    const employee = await prisma.aIEmployee.findFirst({ where: { id: employeeId, workspaceId: workspace.id } });
    if (!employee) return apiErrors.notFound("الموظف");

    const versions = await promptVersionService.listVersions(employeeId);
    return apiSuccess(versions);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
