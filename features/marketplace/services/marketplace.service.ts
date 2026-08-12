// PROPOSAL — target path: features/marketplace/services/marketplace.service.ts (new file)

import { marketplaceRepository } from "@/lib/repositories/marketplace.repository";
import { appReviewService } from "@/features/marketplace/services/app-review.service";

export const marketplaceService = {
  async submitVersion(params: {
    appId: string;
    version: string;
    changelog?: string;
    permissions: string[];
    manifest: Record<string, unknown>;
  }) {
    const previousApproved = await marketplaceRepository.latestApprovedVersion(params.appId);

    const decision = await appReviewService.decide({
      requestedPermissions: params.permissions,
      previousApprovedPermissions: previousApproved?.permissions ?? null,
    });

    return marketplaceRepository.createVersion({
      app: { connect: { id: params.appId } },
      version: params.version,
      changelog: params.changelog,
      permissions: params.permissions,
      manifest: params.manifest as never,
      status: decision.autoApprovable ? "APPROVED" : "PENDING_REVIEW",
      autoApprovable: decision.autoApprovable,
      submittedAt: new Date(),
      reviewNotes: decision.reason,
      // Auto-approved versions still get a "reviewed" timestamp — the
      // system made the decision, which is itself a review event worth
      // recording, not a silent bypass.
      ...(decision.autoApprovable ? { reviewedAt: new Date() } : {}),
    });
  },

  async install(appId: string, workspaceId: string) {
    const app = await marketplaceRepository.findAppById(appId);
    if (!app || !app.isPublished) throw new Error("التطبيق ده مش متاح للتثبيت");

    const latestApproved = await marketplaceRepository.latestApprovedVersion(appId);
    if (!latestApproved) throw new Error("مفيش نسخة معتمدة من التطبيق ده لسه");

    return marketplaceRepository.upsertInstall({ appId, versionId: latestApproved.id, workspaceId });
  },
};
