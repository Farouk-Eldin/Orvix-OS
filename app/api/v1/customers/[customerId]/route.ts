// PROPOSAL — target path: app/api/v1/customers/[customerId]/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { customerRepository } from "@/lib/repositories/customer.repository";
import { apiError, apiSuccess, apiErrors } from "@/lib/api-response";

export async function GET(_request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { customerId } = await params;

    const customer = await customerRepository.findByIdInWorkspace(customerId, workspace.id);
    if (!customer) return apiErrors.notFound("العميل");

    const timeline = await customerRepository.getTimeline(customerId);

    return apiSuccess({ customer, timeline });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { customerId } = await params;

    const existing = await customerRepository.findByIdInWorkspace(customerId, workspace.id);
    if (!existing) return apiErrors.notFound("العميل");

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().fieldErrors, 400);

    const customer = await customerRepository.update(customerId, parsed.data);
    return apiSuccess(customer, "تم تحديث بيانات العميل");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
