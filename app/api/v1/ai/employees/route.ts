// PROPOSAL — target path: app/api/v1/ai/employees/route.ts (new file)
// Additive alongside the singular /api/v1/ai/employee route above —
// this is for managing the full roster, that one keeps serving the
// existing single-employee settings form unchanged.

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const ROLE_VALUES = [
  "GENERAL",
  "SUPPORT",
  "SALES",
  "RECEPTIONIST",
  "BOOKING",
  "MARKETING",
  "FINANCE",
  "CRM",
  "ANALYTICS",
  "KNOWLEDGE_MANAGER",
] as const;

const createEmployeeSchema = z.object({
  name: z.string().min(1).max(50),
  role: z.enum(ROLE_VALUES),
  welcomeMessage: z.string().min(1).max(500),
  businessDescription: z.string().min(1).max(1000),
  systemInstructions: z.string().min(1).max(3000),
  canManageBookings: z.boolean().default(false),
});

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();
    const employees = await prisma.aIEmployee.findMany({
      where: { workspaceId: workspace.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return apiSuccess(employees);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`employees-create:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = createEmployeeSchema.safeParse(json);
    if (!parsed.success) {
      return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);
    }

    // New employees are never auto-default — the workspace already has
    // exactly one default (today's original employee), and "which one
    // replies on WhatsApp" should be a deliberate choice, not a side
    // effect of creation order.
    const employee = await prisma.aIEmployee.create({
      data: {
        workspace: { connect: { id: workspace.id } },
        name: parsed.data.name,
        role: parsed.data.role,
        isDefault: false,
        canManageBookings: parsed.data.canManageBookings,
        welcomeMessage: parsed.data.welcomeMessage,
        businessDescription: parsed.data.businessDescription,
        systemInstructions: parsed.data.systemInstructions,
      },
    });

    return apiSuccess(employee, "تم إضافة الموظف");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/ai/employees failed:", error);
    return apiErrors.serverError();
  }
}
