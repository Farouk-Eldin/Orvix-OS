import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { aiWorkflowBuilderService } from "@/features/workflow-builder/services/ai-workflow-builder.service";
import { workflowRepository } from "@/lib/repositories/workflow.repository";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const generateSchema = z.object({
  description: z.string().min(10, "وصف الأتمتة قصير أوي — وضّح أكتر"),
});

export async function POST(request: Request) {
  try {
    const { workspace } = await requireWorkspace();

    const { allowed } = await rateLimit(`workflow-ai-generate:${workspace.id}`, RATE_LIMITS.api);
    if (!allowed) return apiErrors.rateLimited();

    const json = await request.json();
    const parsed = generateSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().fieldErrors, 400);

    let graph;
    try {
      graph = await aiWorkflowBuilderService.generateFromDescription(workspace.id, parsed.data.description);
    } catch (error) {
      return apiError(error instanceof Error ? error.message : "تعذّر بناء الأتمتة", [], 422);
    }

    // Created as a DRAFT on purpose — always reviewed on the canvas
    // before it can run against real customers, same as building one
    // from scratch by hand.
    const created = await workflowRepository.create({ workspace: { connect: { id: workspace.id } }, name: graph.name });
    const withGraph = await workflowRepository.replaceGraph(created.id, {
      nodes: graph.nodes,
      edges: graph.edges.map((e) => ({ from: e.from, to: e.to, branch: e.branch ?? null })),
    });

    return apiSuccess({ workflow: withGraph }, "تم بناء الأتمتة — راجعها قبل النشر");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/v1/workflows/ai-generate failed:", error);
    return apiErrors.serverError();
  }
}
