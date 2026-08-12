// PROPOSAL — target path: features/marketplace/services/app-review.service.ts (new file)
//
// Implements exactly the stated policy:
//   1. New app (no prior APPROVED version) -> always manual review.
//   2. Update requesting a permission not in the previous APPROVED
//      version -> always manual review.
//   3. Update touching any sensitive permission (billing, security,
//      admin, payments — admin-configurable list, see
//      platform-settings.service.ts) -> always manual review, EVEN IF
//      that permission isn't technically "new" (a sensitive permission
//      never gets a free pass just because a past version already had it).
//   4. Otherwise (strict subset of previously-approved permissions,
//      nothing sensitive) -> auto-approvable, but only if the platform
//      settings' autoApprovalEnabled toggle is on.

import { platformSettingsService } from "@/features/admin/services/platform-settings.service";

export interface ReviewDecision {
  autoApprovable: boolean;
  reason: string;
}

export const appReviewService = {
  async decide(params: {
    requestedPermissions: string[];
    previousApprovedPermissions: string[] | null; // null = no approved version exists yet
  }): Promise<ReviewDecision> {
    const settings = await platformSettingsService.getMarketplaceSettings();

    if (!settings.autoApprovalEnabled) {
      return { autoApprovable: false, reason: "الموافقة التلقائية متوقفة من إعدادات المنصة" };
    }

    const sensitiveRequested = params.requestedPermissions.filter((p) => settings.sensitivePermissions.includes(p));
    if (sensitiveRequested.length > 0) {
      return { autoApprovable: false, reason: `صلاحيات حساسة: ${sensitiveRequested.join(", ")}` };
    }

    if (params.previousApprovedPermissions === null) {
      return { autoApprovable: false, reason: "أول إصدار للتطبيق ده — لازم مراجعة يدوية" };
    }

    const previousSet = new Set(params.previousApprovedPermissions);
    const newPermissions = params.requestedPermissions.filter((p) => !previousSet.has(p));
    if (newPermissions.length > 0) {
      return {
        autoApprovable: false,
        reason: `صلاحيات جديدة مش موجودة في النسخة المعتمدة السابقة: ${newPermissions.join(", ")}`,
      };
    }

    return { autoApprovable: true, reason: "نفس الصلاحيات أو أقل من النسخة المعتمدة السابقة، مفيش صلاحيات حساسة" };
  },
};
