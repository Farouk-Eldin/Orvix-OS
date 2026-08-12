// PROPOSAL — target path: app/api/v1/ai/employees/[employeeId]/experiments/route.ts (new file)

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { promptExperimentService } from "@/features/ai/services/prompt-experiment.service";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const snapshotSchema = z.object({
  personality: z.enum(["PROFESSIONAL", "FRIENDLY", "LUXURY", "MEDICAL", "SALES", "SUPPORT", "MINIMAL"]),
  tone: z.string().min(1),
  language: z.enum(["AR", "EN", "AUTO"]),
  replyLength: z.enum(["SHORT", "DETAILED"]),
  emojiUsage: z.boolean(),
  welcomeMessage: z.string().min(1),
  businessDescription: z.string().min(1),
  systemInstructions: z.string().min(1),
});

const createSchema = z.object({
  name: z.string().min(1),
  variantB: snapshotSchema, // variant A is always the employee's CURRENT live config — see below
  trafficSplitPercent: z.number().int().min(1).max(99).default(50),
});

export async function GET(_request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { employeeId } = await params;

    const employee = await prisma.aIEmployee.findFirst({ where: { id: employeeId, workspaceId: workspace.id } });
    if (!employee) return apiErrors.notFound("الموظف");

    const experiments = await prisma.promptExperiment.findMany({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    });
    return apiSuccess(experiments);
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { employeeId } = await params;

    const employee = await prisma.aIEmployee.findFirst({ where: { id: employeeId, workspaceId: workspace.id } });
    if (!employee) return apiErrors.notFound("الموظف");

    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    // Variant A is always a snapshot of what's live right now — the
    // person only has to design variant B, the "change" they want to
    // test, not retype the current config too.
    const variantASnapshot = {
      personality: employee.personality,
      tone: employee.tone,
      language: employee.language,
      replyLength: employee.replyLength,
      emojiUsage: employee.emojiUsage,
      welcomeMessage: employee.welcomeMessage,
      businessDescription: employee.businessDescription,
      systemInstructions: employee.systemInstructions,
    };

    const experiment = await promptExperimentService.create({
      workspaceId: workspace.id,
      employeeId,
      name: parsed.data.name,
      variantASnapshot,
      variantBSnapshot: parsed.data.variantB,
      trafficSplitPercent: parsed.data.trafficSplitPercent,
    });

    return apiSuccess(experiment, "اتعملت التجربة كمسودة — ابدأها لما تكون جاهز");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    if (error instanceof Error && error.message.includes("تجربة شغالة")) {
      return apiError(error.message, [], 409);
    }
    console.error("POST .../experiments failed:", error);
    return apiErrors.serverError();
  }
}
