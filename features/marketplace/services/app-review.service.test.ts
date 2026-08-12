// PROPOSAL — target path: features/marketplace/services/app-review.service.test.ts (new file)

import { describe, it, expect, vi, beforeEach } from "vitest";

const getMarketplaceSettings = vi.fn();

vi.mock("@/features/admin/services/platform-settings.service", () => ({
  platformSettingsService: { getMarketplaceSettings: () => getMarketplaceSettings() },
}));

const DEFAULT_SETTINGS = {
  autoApprovalEnabled: true,
  sensitivePermissions: ["billing:manage", "security:manage", "admin:manage"],
};

describe("appReviewService.decide", () => {
  beforeEach(() => getMarketplaceSettings.mockReset());

  it("requires manual review for a brand-new app regardless of permissions", async () => {
    getMarketplaceSettings.mockResolvedValue(DEFAULT_SETTINGS);
    const { appReviewService } = await import("./app-review.service");

    const result = await appReviewService.decide({
      requestedPermissions: ["customers:read"],
      previousApprovedPermissions: null,
    });

    expect(result.autoApprovable).toBe(false);
  });

  it("auto-approves an update with the exact same permissions as the previous approved version", async () => {
    getMarketplaceSettings.mockResolvedValue(DEFAULT_SETTINGS);
    const { appReviewService } = await import("./app-review.service");

    const result = await appReviewService.decide({
      requestedPermissions: ["customers:read", "bookings:read"],
      previousApprovedPermissions: ["customers:read", "bookings:read"],
    });

    expect(result.autoApprovable).toBe(true);
  });

  it("auto-approves an update requesting FEWER permissions than before (a strict subset)", async () => {
    getMarketplaceSettings.mockResolvedValue(DEFAULT_SETTINGS);
    const { appReviewService } = await import("./app-review.service");

    const result = await appReviewService.decide({
      requestedPermissions: ["customers:read"],
      previousApprovedPermissions: ["customers:read", "bookings:read"],
    });

    expect(result.autoApprovable).toBe(true);
  });

  it("requires manual review when a genuinely new permission is requested", async () => {
    getMarketplaceSettings.mockResolvedValue(DEFAULT_SETTINGS);
    const { appReviewService } = await import("./app-review.service");

    const result = await appReviewService.decide({
      requestedPermissions: ["customers:read", "workflows:write"],
      previousApprovedPermissions: ["customers:read"],
    });

    expect(result.autoApprovable).toBe(false);
    expect(result.reason).toContain("workflows:write");
  });

  it("requires manual review for a sensitive permission even if it's not new (was already approved before)", async () => {
    getMarketplaceSettings.mockResolvedValue(DEFAULT_SETTINGS);
    const { appReviewService } = await import("./app-review.service");

    // billing:manage was already in the previous approved version — a
    // naive "only NEW permissions trigger review" check would wrongly
    // auto-approve this. Sensitive permissions must never get a free pass.
    const result = await appReviewService.decide({
      requestedPermissions: ["billing:manage"],
      previousApprovedPermissions: ["billing:manage"],
    });

    expect(result.autoApprovable).toBe(false);
    expect(result.reason).toContain("billing:manage");
  });

  it("forces manual review for everything when the admin has disabled auto-approval", async () => {
    getMarketplaceSettings.mockResolvedValue({ ...DEFAULT_SETTINGS, autoApprovalEnabled: false });
    const { appReviewService } = await import("./app-review.service");

    const result = await appReviewService.decide({
      requestedPermissions: ["customers:read"],
      previousApprovedPermissions: ["customers:read"],
    });

    expect(result.autoApprovable).toBe(false);
  });

  it("respects an admin-edited sensitive permissions list, not a hardcoded one", async () => {
    getMarketplaceSettings.mockResolvedValue({
      autoApprovalEnabled: true,
      sensitivePermissions: ["customers:read"], // admin added a normally-harmless permission to the sensitive list
    });
    const { appReviewService } = await import("./app-review.service");

    const result = await appReviewService.decide({
      requestedPermissions: ["customers:read"],
      previousApprovedPermissions: ["customers:read"],
    });

    expect(result.autoApprovable).toBe(false);
  });
});
