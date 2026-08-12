// PROPOSAL — target path: app/api/v1/resources/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const dayRangeSchema = z.object({ open: z.string(), close: z.string() });
const workingHoursSchema = z
  .object({
    sun: z.array(dayRangeSchema).optional(),
    mon: z.array(dayRangeSchema).optional(),
    tue: z.array(dayRangeSchema).optional(),
    wed: z.array(dayRangeSchema).optional(),
    thu: z.array(dayRangeSchema).optional(),
    fri: z.array(dayRangeSchema).optional(),
    sat: z.array(dayRangeSchema).optional(),
  })
  .optional();

const createResourceSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  kind: z.enum(["PERSON", "SPACE", "ASSET", "GENERIC"]).default("GENERIC"),
  workingHours: workingHoursSchema,
  maxPerSlot: z.number().int().min(1).max(50).default(1),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const resources = await bookingRepository.listResources(workspace.id);
    return apiSuccess(resources);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`resources-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createResourceSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    const resource = await bookingRepository.createResource({
      workspace: { connect: { id: workspace.id } },
      name: parsed.data.name,
      kind: parsed.data.kind,
      workingHours: parsed.data.workingHours ?? {},
      maxPerSlot: parsed.data.maxPerSlot,
    });

    return apiSuccess(resource, "تم إضافة المورد");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/resources failed:", error);
    return apiErrors.serverError();
  }
}
