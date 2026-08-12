import { z } from "zod";

import {
  requireWorkspace,
  requirePermission,
  UnauthorizedError,
  NoWorkspaceError,
  ForbiddenError,
} from "@/features/authentication/services/get-current-workspace";
import { branchRepository } from "@/lib/repositories/branch.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const createSchema = z.object({
  name: z.string().min(1, "اسم الفرع مطلوب"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const branches = await branchRepository.listForWorkspace(workspace.id);
    return apiSuccess(branches);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requirePermission("settings:manage");

    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().fieldErrors, 400);

    const branch = await branchRepository.create({
      workspace: { connect: { id: workspace.id } },
      name: parsed.data.name,
      address: parsed.data.address,
      phone: parsed.data.phone,
    });

    return apiSuccess(branch, "تم إضافة الفرع");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof ForbiddenError) return apiError(error.message, [], 403);
    return apiErrors.serverError();
  }
}
