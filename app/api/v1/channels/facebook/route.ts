import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { encryptChannelSecret } from "@/lib/encryption";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

const GRAPH_API_VERSION = "v23.0";

const connectSchema = z.object({
  pageId: z.string().min(3, "Page ID مطلوب"),
  pageName: z.string().min(1, "اسم الصفحة مطلوب"),
  accessToken: z.string().min(10, "التوكن قصير أوي"),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const account = await prisma.facebookPage.findUnique({ where: { workspaceId: workspace.id } });
    if (!account) return apiSuccess(null);
    return apiSuccess({ pageName: account.pageName, status: account.status, connectedAt: account.createdAt });
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
    const parsed = connectSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const verifyRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${parsed.data.pageId}?fields=id`, {
      headers: { Authorization: `Bearer ${parsed.data.accessToken}` },
    });
    if (!verifyRes.ok) {
      const body = await verifyRes.json().catch(() => null);
      return apiError(
        "متقدرش نتأكد من البيانات دي مع Meta — راجع الـ Page ID والتوكن",
        [body?.error?.message ?? `HTTP ${verifyRes.status}`],
        422
      );
    }

    const account = await prisma.facebookPage.upsert({
      where: { workspaceId: workspace.id },
      update: {
        pageId: parsed.data.pageId,
        pageName: parsed.data.pageName,
        accessToken: encryptChannelSecret(parsed.data.accessToken),
        status: "CONNECTED",
      },
      create: {
        workspaceId: workspace.id,
        pageId: parsed.data.pageId,
        pageName: parsed.data.pageName,
        accessToken: encryptChannelSecret(parsed.data.accessToken),
        status: "CONNECTED",
      },
    });

    return apiSuccess({ pageName: account.pageName, status: account.status }, "تم ربط فيسبوك بنجاح");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/channels/facebook failed:", error);
    return apiErrors.serverError();
  }
}

export async function DELETE() {
  try {
    const { workspace } = await requireWorkspace();
    await prisma.facebookPage.deleteMany({ where: { workspaceId: workspace.id } });
    return apiSuccess({ disconnected: true }, "تم فصل فيسبوك");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
