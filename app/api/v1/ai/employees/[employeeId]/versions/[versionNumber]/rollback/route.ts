// PROPOSAL — target path: app/api/v1/ai/employees/[employeeId]/versions/[versionNumber]/rollback/route.ts (new file)

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { promptVersionService } from "@/features/ai/services/prompt-version.service";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string; versionNumber: string }> }
) {
  try {
    const { user, workspace } = await requireWorkspace();
    const { employeeId, versionNumber } = await params;

    const employee = await prisma.aIEmployee.findFirst({ where: { id: employeeId, workspaceId: workspace.id } });
    if (!employee) return apiErrors.notFound("الموظف");

    const versionNum = Number(versionNumber);
    if (!Number.isInteger(versionNum)) return apiError("رقم نسخة غير صحيح", [], 400);

    const restored = await promptVersionService.rollback(employeeId, versionNum, user.id);
    return apiSuccess(restored, `تم الرجوع للنسخة ${versionNum}`);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof Error && error.message.includes("مش موجودة")) {
      return apiErrors.notFound("النسخة");
    }
    console.error("POST .../rollback failed:", error);
    return apiErrors.serverError();
  }
}
