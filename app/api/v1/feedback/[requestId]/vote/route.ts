import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { featureRequestRepository } from "@/lib/repositories/feature-request.repository";
import { apiSuccess, apiErrors } from "@/lib/api-response";

export async function POST(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { requestId } = await params;

    const existingVotes = await featureRequestRepository.listVotesForWorkspace(workspace.id);
    const hasVoted = existingVotes.some((v) => v.featureRequestId === requestId);

    if (hasVoted) {
      await featureRequestRepository.removeVote(requestId, workspace.id);
      return apiSuccess({ voted: false }, "اتشال الصوت");
    }

    await featureRequestRepository.addVote(requestId, workspace.id);
    return apiSuccess({ voted: true }, "تم التصويت");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
