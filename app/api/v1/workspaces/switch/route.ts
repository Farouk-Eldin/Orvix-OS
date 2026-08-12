// PROPOSAL — target path: app/api/v1/workspaces/switch/route.ts (new file)

import { z } from "zod";

import {
  getCurrentUser,
  UnauthorizedError,
} from "@/features/authentication/services/get-current-workspace";
import { teamMemberRepository } from "@/lib/repositories/team-member.repository";
import { workspaceRepository } from "@/lib/repositories/workspace.repository";
import { prisma } from "@/lib/prisma";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const switchSchema = z.object({ workspaceId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiErrors.unauthorized();

    const json = await request.json();
    const parsed = switchSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", [], 400);

    // The membership check is what actually matters — a workspaceId
    // alone proves nothing, this confirms the person really belongs there.
    const membership = await teamMemberRepository.findMembership(user.id, parsed.data.workspaceId);
    if (!membership) return apiError("مش عضو في النشاط ده", [], 403);

    const workspace = await workspaceRepository.findWithEssentials(parsed.data.workspaceId);
    if (!workspace) return apiErrors.notFound("النشاط");

    await prisma.user.update({
      where: { id: user.id },
      data: { workspaceId: workspace.id, role: membership.role },
    });

    return apiSuccess({ workspaceId: workspace.id, name: workspace.name }, "تم التبديل");
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}
