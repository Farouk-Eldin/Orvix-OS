// PROPOSAL — target path: app/api/v1/developer/marketplace/apps/route.ts (new file)
// "Developer" here = your own workspace, building an app that OTHER
// workspaces can install — reuses the existing workspace/auth system
// rather than inventing a separate developer-account concept.

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { marketplaceRepository } from "@/lib/repositories/marketplace.repository";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const APP_TYPES = [
  "AI_EMPLOYEE",
  "INTEGRATION",
  "WORKFLOW_TEMPLATE",
  "KNOWLEDGE_TEMPLATE",
  "THEME",
  "REPORT",
  "WIDGET",
] as const;

const createAppSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "الـ slug يقبل حروف إنجليزي صغيرة وأرقام وشرطة بس"),
  description: z.string().min(1).max(1000),
  type: z.enum(APP_TYPES),
  iconUrl: z.string().url().optional(),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const apps = await marketplaceRepository.listForDeveloper(workspace.id);
    return apiSuccess(apps);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`marketplace-app-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createAppSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    const app = await marketplaceRepository.createApp({
      developerWorkspace: { connect: { id: workspace.id } },
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      type: parsed.data.type,
      iconUrl: parsed.data.iconUrl,
    });

    return apiSuccess(app, "اتعمل التطبيق — دلوقتي قدّم أول نسخة عشان تدخل المراجعة");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return apiError("الـ slug ده مستخدم بالفعل", [], 409);
    }
    console.error("POST /api/v1/developer/marketplace/apps failed:", error);
    return apiErrors.serverError();
  }
}
