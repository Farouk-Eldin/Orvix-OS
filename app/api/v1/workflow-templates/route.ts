// PROPOSAL — target path: app/api/v1/workflow-templates/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { workflowTemplateService } from "@/features/workflow-builder/services/workflow-template.service";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const saveAsTemplateSchema = z.object({
  workflowId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const templates = await workflowTemplateService.listAvailable(workspace.id);
    return apiSuccess(templates);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const json = await request.json();
    const parsed = saveAsTemplateSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    const template = await workflowTemplateService.saveAsTemplate(
      parsed.data.workflowId,
      workspace.id,
      parsed.data.name,
      parsed.data.description
    );

    return apiSuccess(
      template,
      "اتحفظ كقالب — البيانات الخاصة بالعملاء والخدمات اتشالت، هتحتاج تحددها تاني كل مرة تستخدمه"
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/workflow-templates failed:", error);
    return apiErrors.serverError();
  }
}
