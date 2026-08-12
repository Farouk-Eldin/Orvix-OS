// PROPOSAL — target path: app/api/v1/services/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const createServiceSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  description: z.string().optional(),
  durationMin: z.number().int().min(5).max(600),
  price: z.number().nonnegative().optional(),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const services = await bookingRepository.listServices(workspace.id);
    return apiSuccess(services);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`services-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createServiceSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const service = await bookingRepository.createService({
      workspace: { connect: { id: workspace.id } },
      name: parsed.data.name,
      description: parsed.data.description,
      durationMin: parsed.data.durationMin,
      price: parsed.data.price,
    });

    return apiSuccess(service, "تم إضافة الخدمة");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/services failed:", error);
    return apiErrors.serverError();
  }
}
