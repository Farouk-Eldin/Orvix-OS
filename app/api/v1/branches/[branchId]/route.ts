import { z } from "zod";

import {
  requirePermission,
  UnauthorizedError,
  NoWorkspaceError,
  ForbiddenError,
} from "@/features/authentication/services/get-current-workspace";
import { branchRepository } from "@/lib/repositories/branch.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ branchId: string }> }) {
  try {
    const { workspace } = await requirePermission("settings:manage");
    const { branchId } = await params;

    const existing = await branchRepository.findByIdInWorkspace(branchId, workspace.id);
    if (!existing) return apiErrors.notFound("الفرع");

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().fieldErrors, 400);

    const branch = await branchRepository.update(branchId, parsed.data);
    return apiSuccess(branch, "تم التحديث");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof ForbiddenError) return apiError(error.message, [], 403);
    return apiErrors.serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ branchId: string }> }) {
  try {
    const { workspace } = await requirePermission("settings:manage");
    const { branchId } = await params;

    const existing = await branchRepository.findByIdInWorkspace(branchId, workspace.id);
    if (!existing) return apiErrors.notFound("الفرع");

    // Resources pointing here fall back to workspace-wide (branchId ->
    // null via onDelete: SetNull in the schema) — nothing about them
    // breaks, they just stop being scoped to a specific location.
    await branchRepository.delete(branchId);
    return apiSuccess({ deleted: true }, "تم حذف الفرع");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof ForbiddenError) return apiError(error.message, [], 403);
    return apiErrors.serverError();
  }
}
