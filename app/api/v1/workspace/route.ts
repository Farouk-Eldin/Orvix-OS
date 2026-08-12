import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { workspaceRepository } from "@/lib/repositories/workspace.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const updateSchema = z.object({
  name: z.string().min(2).max(80),
  logo: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    return apiSuccess(workspace);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function PATCH(request: Request) {
  try {
    const { workspace } = await requireWorkspace();
    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const updated = await workspaceRepository.update(workspace.id, {
      name: parsed.data.name,
      logo: parsed.data.logo || null,
    });

    return apiSuccess(updated, "تم حفظ بيانات النشاط");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
