import { z } from "zod";

import {
  requireWorkspace,
  requirePermission,
  UnauthorizedError,
  NoWorkspaceError,
  ForbiddenError,
  TEAM_PERMISSIONS,
} from "@/features/authentication/services/get-current-workspace";
import { teamMemberRepository } from "@/lib/repositories/team-member.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const members = await teamMemberRepository.listForWorkspace(workspace.id);
    return apiSuccess(members);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

const updateSchema = z.object({
  memberId: z.string(),
  role: z.enum(["ADMIN", "MEMBER"]).optional(),
  permissions: z.array(z.enum(TEAM_PERMISSIONS)).optional(),
});

export async function PATCH(request: Request) {
  try {
    const { workspace } = await requirePermission("team:manage");

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) return apiError("طلب غير صحيح", parsed.error.flatten().fieldErrors, 400);

    const member = await teamMemberRepository.findById(parsed.data.memberId);
    if (!member || member.workspaceId !== workspace.id) return apiErrors.notFound("العضو");
    if (member.role === "OWNER") return apiError("متقدرش تعدّل المالك", [], 400);

    let updated = member;
    if (parsed.data.role) {
      updated = await teamMemberRepository.updateRole(member.id, member.userId, parsed.data.role);
    }
    // Granular permissions matter for MEMBER only — ADMIN already passes
    // every requirePermission() check regardless of this list.
    if (parsed.data.permissions) {
      updated = await teamMemberRepository.updatePermissions(member.id, parsed.data.permissions);
    }

    return apiSuccess(updated, "تم التحديث");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof ForbiddenError) return apiError(error.message, [], 403);
    return apiErrors.serverError();
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspace } = await requirePermission("team:manage");

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("memberId");
    if (!memberId) return apiError("memberId مطلوب", [], 400);

    const member = await teamMemberRepository.findById(memberId);
    if (!member || member.workspaceId !== workspace.id) return apiErrors.notFound("العضو");
    if (member.role === "OWNER") return apiError("متقدرش تشيل المالك", [], 400);

    await teamMemberRepository.remove(memberId, member.userId);
    return apiSuccess({ removed: true }, "تم حذف العضو");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof ForbiddenError) return apiError(error.message, [], 403);
    return apiErrors.serverError();
  }
}
