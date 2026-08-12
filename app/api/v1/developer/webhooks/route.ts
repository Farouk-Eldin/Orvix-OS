// PROPOSAL — target path: app/api/v1/developer/webhooks/route.ts (new file)

import { z } from "zod";
import { randomBytes } from "crypto";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const EVENT_VALUES = ["CUSTOMER_CREATED", "BOOKING_CREATED", "BOOKING_STATUS_CHANGED", "PAYMENT_SUCCEEDED"] as const;

const createSchema = z.object({
  name: z.string().min(1),
  endpointUrl: z.string().url(),
  events: z.array(z.enum(EVENT_VALUES)).min(1),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const subs = await prisma.webhookSubscription.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, endpointUrl: true, events: true, active: true, createdAt: true },
      // secret intentionally excluded — shown once at creation only
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(subs);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`webhooks-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const secret = randomBytes(24).toString("hex");

    const subscription = await prisma.webhookSubscription.create({
      data: {
        workspace: { connect: { id: workspace.id } },
        name: parsed.data.name,
        endpointUrl: parsed.data.endpointUrl,
        events: parsed.data.events,
        secret,
      },
    });

    return apiSuccess(
      { id: subscription.id, secret },
      "احفظ الـ secret ده دلوقتي — بيتستخدم للتحقق من التوقيع ومش هيتعرض تاني"
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/developer/webhooks failed:", error);
    return apiErrors.serverError();
  }
}
