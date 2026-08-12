import { auth, currentUser } from "@clerk/nextjs/server";

import { userRepository } from "@/lib/repositories/user.repository";
import { workspaceRepository } from "@/lib/repositories/workspace.repository";
import { teamMemberRepository } from "@/lib/repositories/team-member.repository";

/**
 * Resolves the signed-in Clerk user to our own User row, creating it on
 * first sight if the Clerk webhook hasn't landed yet (defensive — the
 * webhook in app/api/webhooks/clerk/route.ts is the primary sync path).
 * Returns null if nobody is signed in.
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  let user = await userRepository.findByClerkId(userId);

  if (!user) {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    user = await userRepository.create({
      clerkId: clerkUser.id,
      name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "مستخدم جديد",
      email: clerkUser.primaryEmailAddress?.emailAddress ?? `${clerkUser.id}@placeholder.local`,
      avatar: clerkUser.imageUrl,
    });
  }

  return user;
}

/** Returns { user, workspace } — workspace is null until onboarding completes. */
export async function getCurrentUserWithWorkspace() {
  const user = await getCurrentUser();
  if (!user) return { user: null, workspace: null };

  const workspace = user.workspaceId ? await workspaceRepository.findWithEssentials(user.workspaceId) : null;

  return { user, workspace };
}

export class UnauthorizedError extends Error {}
export class NoWorkspaceError extends Error {}
export class NotSuperAdminError extends Error {}
export class ForbiddenError extends Error {}

export const TEAM_PERMISSIONS = [
  "bookings:write",
  "crm:write",
  "knowledge:manage",
  "billing:manage",
  "team:manage",
  "settings:manage",
] as const;
export type TeamPermission = (typeof TEAM_PERMISSIONS)[number];

/** For API routes: resolves the caller's workspace or throws a typed error the route maps to 401/403. */
export async function requireWorkspace() {
  const { user, workspace } = await getCurrentUserWithWorkspace();
  if (!user) throw new UnauthorizedError("Not signed in");
  if (!workspace) throw new NoWorkspaceError("Onboarding not completed");
  return { user, workspace };
}

/**
 * OWNER and ADMIN always pass — granular permissions only gate what a
 * plain MEMBER can do, via TeamMember.permissions. A route that wants
 * "only people I've explicitly allowed" (deleting knowledge, managing
 * billing, managing the team itself) calls this instead of requireWorkspace().
 */
export async function requirePermission(permission: TeamPermission) {
  const { user, workspace } = await requireWorkspace();

  if (user.role === "OWNER" || user.role === "ADMIN") {
    return { user, workspace };
  }

  const membership = await teamMemberRepository.findMembership(user.id, workspace.id);
  const granted = (membership?.permissions as string[] | null) ?? [];
  if (!granted.includes(permission)) {
    throw new ForbiddenError(`محتاج صلاحية "${permission}" عشان تعمل ده`);
  }

  return { user, workspace };
}

/** Every /admin page and /api/v1/admin/* route calls this first — platform-level, unrelated to any workspace role. */
export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError("Not signed in");
  if (!user.isSuperAdmin) throw new NotSuperAdminError("Not a super admin");
  return { user };
}
