import { z } from "zod";

import {
  requireSuperAdmin,
  UnauthorizedError,
  NotSuperAdminError,
} from "@/features/authentication/services/get-current-workspace";
import { workspaceAdminService } from "@/features/admin/services/workspace-admin.service";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const actionSchema = z.object({ action: z.enum(["suspend", "activate"]) });

export async function GET(_request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { user } = await requireSuperAdmin();
    const { workspaceId } = await params;
    const workspace = await workspaceAdminService.getDetail(workspaceId);
    if (!workspace) return apiErrors.notFound("النشاط");

    await prisma.auditLog.create({
      data: { workspaceId, userId: user.id, action: "admin.viewed_workspace_detail" },
    });

    return apiSuccess(workspace);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    const { user } = await requireSuperAdmin();
    const { workspaceId } = await params;
    const json = await request.json();
    const parsed = actionSchema.safeParse(json);
    if (!parsed.success) return apiError("طلب غير صحيح", [], 400);

    const workspace =
      parsed.data.action === "suspend"
        ? await workspaceAdminService.suspend(workspaceId)
        : await workspaceAdminService.activate(workspaceId);

    await prisma.auditLog.create({
      data: { workspaceId, userId: user.id, action: `admin.${parsed.data.action}` },
    });

    return apiSuccess(workspace, parsed.data.action === "suspend" ? "تم إيقاف النشاط" : "تم تفعيل النشاط");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  try {
    await requireSuperAdmin();
    const { workspaceId } = await params;
    await workspaceAdminService.delete(workspaceId);
    return apiSuccess({ deleted: true }, "تم حذف النشاط نهائيًا");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
