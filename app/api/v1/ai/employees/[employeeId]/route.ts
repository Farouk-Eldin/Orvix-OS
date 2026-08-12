// PROPOSAL — target path: app/api/v1/ai/employees/[employeeId]/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const updateSchema = z.object({
  canManageBookings: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { employeeId } = await params;

    const existing = await prisma.aIEmployee.findFirst({ where: { id: employeeId, workspaceId: workspace.id } });
    if (!existing) return apiErrors.notFound("الموظف");

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    if (parsed.data.isDefault === true) {
      // Exactly one default per workspace, always — unset the old one
      // and set the new one inside the same transaction so a crash
      // between the two writes can't leave the workspace with zero.
      const updated = await prisma.$transaction(async (tx) => {
        await tx.aIEmployee.updateMany({ where: { workspaceId: workspace.id, isDefault: true }, data: { isDefault: false } });
        return tx.aIEmployee.update({
          where: { id: employeeId },
          data: { isDefault: true, ...(parsed.data.canManageBookings !== undefined ? { canManageBookings: parsed.data.canManageBookings } : {}) },
        });
      });
      return apiSuccess(updated, "تم التحديث");
    }

    if (existing.isDefault && parsed.data.isDefault === false) {
      return apiError("لازم يكون فيه موظف افتراضي واحد على الأقل — خلي موظف تاني هو الافتراضي الأول", [], 400);
    }

    const updated = await prisma.aIEmployee.update({
      where: { id: employeeId },
      data: { ...(parsed.data.canManageBookings !== undefined ? { canManageBookings: parsed.data.canManageBookings } : {}) },
    });

    return apiSuccess(updated, "تم التحديث");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("PATCH /api/v1/ai/employees/[employeeId] failed:", error);
    return apiErrors.serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { employeeId } = await params;

    const existing = await prisma.aIEmployee.findFirst({ where: { id: employeeId, workspaceId: workspace.id } });
    if (!existing) return apiErrors.notFound("الموظف");
    if (existing.isDefault) {
      return apiError("متقدرش تمسح الموظف الافتراضي — خلي موظف تاني هو الافتراضي الأول", [], 400);
    }

    await prisma.aIEmployee.delete({ where: { id: employeeId } });
    return apiSuccess({ deleted: true }, "تم حذف الموظف");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
