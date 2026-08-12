// PROPOSAL — target path: app/api/v1/branding/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "لون غير صحيح — لازم يكون بصيغة hex زي #4F46E5");

const brandingSchema = z.object({
  logo: z.string().url().optional().or(z.literal("")),
  favicon: z.string().url().optional().or(z.literal("")),
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  customCss: z.string().max(20_000).optional(), // capped — this isn't a general code editor
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const full = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      select: { logo: true, favicon: true, primaryColor: true, secondaryColor: true, customCss: true },
    });
    return apiSuccess(full);
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
    const parsed = brandingSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: parsed.data,
    });

    return apiSuccess(updated, "تم حفظ الهوية البصرية");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
