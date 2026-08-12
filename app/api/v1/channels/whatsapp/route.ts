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
  phoneNumber: z.string().min(6, "رقم غير صحيح"),
  phoneNumberId: z.string().min(3, "Phone Number ID مطلوب"),
  businessAccountId: z.string().min(3, "WhatsApp Business Account ID مطلوب"),
  accessToken: z.string().min(10, "التوكن قصير أوي"),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const account = await prisma.whatsAppAccount.findUnique({ where: { workspaceId: workspace.id } });
    if (!account) return apiSuccess(null);
    return apiSuccess({
      phoneNumber: account.phoneNumber,
      status: account.status,
      connectedAt: account.createdAt,
    });
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

    // Verify the token/IDs actually work before saving — a bad token
    // saved silently would just show "connected" while nothing works.
    const verifyRes = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${parsed.data.phoneNumberId}?fields=display_phone_number`,
      { headers: { Authorization: `Bearer ${parsed.data.accessToken}` } }
    );
    if (!verifyRes.ok) {
      const body = await verifyRes.json().catch(() => null);
      return apiError(
        "متقدرش نتأكد من البيانات دي مع Meta — راجع الـ Phone Number ID والتوكن",
        [body?.error?.message ?? `HTTP ${verifyRes.status}`],
        422
      );
    }

    const account = await prisma.whatsAppAccount.upsert({
      where: { workspaceId: workspace.id },
      update: {
        phoneNumber: parsed.data.phoneNumber,
        phoneNumberId: parsed.data.phoneNumberId,
        businessAccountId: parsed.data.businessAccountId,
        accessToken: encryptChannelSecret(parsed.data.accessToken),
        status: "CONNECTED",
      },
      create: {
        workspaceId: workspace.id,
        phoneNumber: parsed.data.phoneNumber,
        phoneNumberId: parsed.data.phoneNumberId,
        businessAccountId: parsed.data.businessAccountId,
        accessToken: encryptChannelSecret(parsed.data.accessToken),
        status: "CONNECTED",
      },
    });

    return apiSuccess({ phoneNumber: account.phoneNumber, status: account.status }, "تم ربط واتساب بنجاح");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/channels/whatsapp failed:", error);
    return apiErrors.serverError();
  }
}

export async function DELETE() {
  try {
    const { workspace } = await requireWorkspace();
    await prisma.whatsAppAccount.deleteMany({ where: { workspaceId: workspace.id } });
    return apiSuccess({ disconnected: true }, "تم فصل واتساب");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
