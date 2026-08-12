// PROPOSAL — target path: app/api/v1/branding/domain/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { domainVerificationService } from "@/features/enterprise/services/domain-verification.service";
import { prisma } from "@/lib/prisma";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const requestSchema = z.object({
  domain: z
    .string()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i, "صيغة دومين غير صحيحة"),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const record = await prisma.customDomain.findUnique({ where: { workspaceId: workspace.id } });
    return apiSuccess(record);
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
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    const record = await domainVerificationService.requestDomain(workspace.id, parsed.data.domain.toLowerCase());

    return apiSuccess(
      record,
      `ضيف TXT record باسم _orvix-verify.${record.domain} وقيمته ${record.verificationToken} في إعدادات الـ DNS بتاعتك`
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof Error && error.message.includes("مستخدم بالفعل")) {
      return apiError(error.message, [], 409);
    }
    return apiErrors.serverError();
  }
}
