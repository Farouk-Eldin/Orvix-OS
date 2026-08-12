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
  instagramId: z.string().min(3, "Instagram Business ID مطلوب"),
  username: z.string().min(1, "اسم المستخدم مطلوب"),
  accessToken: z.string().min(10, "التوكن قصير أوي"),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const account = await prisma.instagramAccount.findUnique({ where: { workspaceId: workspace.id } });
    if (!account) return apiSuccess(null);
    return apiSuccess({ username: account.username, status: account.status, connectedAt: account.createdAt });
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

    const verifyRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${parsed.data.instagramId}?fields=id`,
      { headers: { Authorization: `Bearer ${parsed.data.accessToken}` } }
    );
    if (!verifyRes.ok) {
      const body = await verifyRes.json().catch(() => null);
      return apiError(
        "متقدرش نتأكد من البيانات دي مع Meta — راجع الـ Instagram ID والتوكن",
        [body?.error?.message ?? `HTTP ${verifyRes.status}`],
        422
      );
    }

    const account = await prisma.instagramAccount.upsert({
      where: { workspaceId: workspace.id },
      update: {
        instagramId: parsed.data.instagramId,
        username: parsed.data.username,
        accessToken: encryptChannelSecret(parsed.data.accessToken),
        status: "CONNECTED",
      },
      create: {
        workspaceId: workspace.id,
        instagramId: parsed.data.instagramId,
        username: parsed.data.username,
        accessToken: encryptChannelSecret(parsed.data.accessToken),
        status: "CONNECTED",
      },
    });

    return apiSuccess({ username: account.username, status: account.status }, "تم ربط إنستجرام بنجاح");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/channels/instagram failed:", error);
    return apiErrors.serverError();
  }
}

export async function DELETE() {
  try {
    const { workspace } = await requireWorkspace();
    await prisma.instagramAccount.deleteMany({ where: { workspaceId: workspace.id } });
    return apiSuccess({ disconnected: true }, "تم فصل إنستجرام");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
