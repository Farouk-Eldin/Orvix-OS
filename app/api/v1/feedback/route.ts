import { z } from "zod";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { featureRequestRepository } from "@/lib/repositories/feature-request.repository";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    const { workspace } = await requireWorkspace();

    const [requests, myVotes] = await Promise.all([
      featureRequestRepository.listAll(),
      featureRequestRepository.listVotesForWorkspace(workspace.id),
    ]);
    const votedIds = new Set(myVotes.map((v) => v.featureRequestId));

    return apiSuccess(
      requests
        .map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          status: r.status,
          submittedByName: r.submittedBy.name,
          createdAt: r.createdAt,
          voteCount: r._count.votes,
          hasVoted: votedIds.has(r.id),
        }))
        .sort((a, b) => b.voteCount - a.voteCount)
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}

const createSchema = z.object({
  title: z.string().min(4, "العنوان قصير أوي"),
  description: z.string().min(10, "وضّح الاقتراح أكتر"),
});

export async function POST(request: Request) {
  try {
    const { user, workspace } = await requireWorkspace();

    const json = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().fieldErrors, 400);

    const created = await featureRequestRepository.create({
      workspace: { connect: { id: workspace.id } },
      submittedBy: { connect: { id: user.id } },
      title: parsed.data.title,
      description: parsed.data.description,
    });
    // Submitting a request is an implicit first vote for it.
    await featureRequestRepository.addVote(created.id, workspace.id);

    return apiSuccess(created, "شكرًا على اقتراحك");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
