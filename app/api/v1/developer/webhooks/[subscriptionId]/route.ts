// PROPOSAL — target path: app/api/v1/developer/webhooks/[subscriptionId]/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const patchSchema = z.object({ active: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ subscriptionId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { subscriptionId } = await params;

    const existing = await prisma.webhookSubscription.findFirst({ where: { id: subscriptionId, workspaceId: workspace.id } });
    if (!existing) return apiErrors.notFound("الـ Webhook");

    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    const updated = await prisma.webhookSubscription.update({ where: { id: subscriptionId }, data: { active: parsed.data.active } });
    return apiSuccess(updated, "تم التحديث");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ subscriptionId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { subscriptionId } = await params;

    const existing = await prisma.webhookSubscription.findFirst({ where: { id: subscriptionId, workspaceId: workspace.id } });
    if (!existing) return apiErrors.notFound("الـ Webhook");

    await prisma.webhookSubscription.delete({ where: { id: subscriptionId } });
    return apiSuccess({ deleted: true }, "تم الحذف");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
