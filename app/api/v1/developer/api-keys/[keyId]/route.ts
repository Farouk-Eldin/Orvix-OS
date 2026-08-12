// PROPOSAL — target path: app/api/v1/developer/api-keys/[keyId]/route.ts (new file)

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { apiErrors, apiSuccess } from "@/lib/api-response";

export async function DELETE(_request: Request, { params }: { params: Promise<{ keyId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { keyId } = await params;

    const existing = await prisma.apiKey.findFirst({ where: { id: keyId, workspaceId: workspace.id } });
    if (!existing) return apiErrors.notFound("المفتاح");

    await prisma.apiKey.update({ where: { id: keyId }, data: { revokedAt: new Date() } });
    return apiSuccess({ revoked: true }, "تم إلغاء المفتاح");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
