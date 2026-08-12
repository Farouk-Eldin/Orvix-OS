// PROPOSAL — target path: app/api/v1/ai/employees/[employeeId]/experiments/[experimentId]/route.ts (new file)
// GET returns live results. PATCH transitions status (start / stop with optional winner).

import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { promptExperimentService } from "@/features/ai/services/prompt-experiment.service";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const patchSchema = z.object({
  action: z.enum(["start", "stop"]),
  winnerVariant: z.enum(["A", "B"]).optional(),
});

async function ownedExperiment(experimentId: string, employeeId: string, workspaceId: string) {
  return prisma.promptExperiment.findFirst({ where: { id: experimentId, employeeId, workspaceId } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string; experimentId: string }> }
) {
  try {
    const { workspace } = await requireWorkspace();
    const { employeeId, experimentId } = await params;

    const experiment = await ownedExperiment(experimentId, employeeId, workspace.id);
    if (!experiment) return apiErrors.notFound("التجربة");

    const results = await promptExperimentService.getResults(experimentId);
    return apiSuccess({ experiment, results });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; experimentId: string }> }
) {
  try {
    const { workspace } = await requireWorkspace();
    const { employeeId, experimentId } = await params;

    const experiment = await ownedExperiment(experimentId, employeeId, workspace.id);
    if (!experiment) return apiErrors.notFound("التجربة");

    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", [], 400);

    if (parsed.data.action === "start") {
      if (experiment.status !== "DRAFT") return apiError("التجربة مبدأتش من حالة مسودة", [], 400);
      const updated = await promptExperimentService.start(experimentId);
      return apiSuccess(updated, "بدأت التجربة");
    }

    if (experiment.status !== "RUNNING") return apiError("التجربة مش شغالة أصلًا", [], 400);
    const updated = await promptExperimentService.stop(experimentId, parsed.data.winnerVariant);
    return apiSuccess(
      updated,
      parsed.data.winnerVariant ? `اتوقفت التجربة وتم تطبيق نسخة ${parsed.data.winnerVariant}` : "اتوقفت التجربة"
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("PATCH .../experiments/[experimentId] failed:", error);
    return apiErrors.serverError();
  }
}
