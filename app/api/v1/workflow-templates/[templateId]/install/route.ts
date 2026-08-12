// PROPOSAL — target path: app/api/v1/workflow-templates/[templateId]/install/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { workflowTemplateService } from "@/features/workflow-builder/services/workflow-template.service";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const installSchema = z.object({ name: z.string().min(1) });

export async function POST(request: Request, { params }: { params: Promise<{ templateId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { templateId } = await params;

    const json = await request.json();
    const parsed = installSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", [], 400);

    const workflow = await workflowTemplateService.install(templateId, workspace.id, parsed.data.name);
    return apiSuccess(workflow, "اتنسخ القالب — كمّل الإعدادات الناقصة قبل النشر");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST .../workflow-templates/[templateId]/install failed:", error);
    return apiErrors.serverError();
  }
}
