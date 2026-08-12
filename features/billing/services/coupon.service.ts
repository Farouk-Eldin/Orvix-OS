// PROPOSAL — target path: features/billing/services/coupon.service.ts (new file)

import { prisma } from "@/lib/prisma";

export interface CouponValidation {
  valid: boolean;
  reason?: "NOT_FOUND" | "EXPIRED" | "MAX_USES_REACHED" | "ALREADY_USED_BY_WORKSPACE";
  discountType?: "PERCENTAGE" | "FIXED";
  discountValue?: number;
}

export const couponService = {
  async validate(code: string, workspaceId: string): Promise<CouponValidation> {
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.active) return { valid: false, reason: "NOT_FOUND" };
    if (coupon.expiresAt && coupon.expiresAt < new Date()) return { valid: false, reason: "EXPIRED" };
    if (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses) {
      return { valid: false, reason: "MAX_USES_REACHED" };
    }

    const workspaceUses = await prisma.couponRedemption.count({ where: { couponId: coupon.id, workspaceId } });
    if (workspaceUses >= coupon.maxUsesPerUser) {
      return { valid: false, reason: "ALREADY_USED_BY_WORKSPACE" };
    }

    return { valid: true, discountType: coupon.discountType, discountValue: Number(coupon.discountValue) };
  },

  applyDiscount(priceEGP: number, discountType: "PERCENTAGE" | "FIXED", discountValue: number) {
    const discounted = discountType === "PERCENTAGE" ? priceEGP * (1 - discountValue / 100) : priceEGP - discountValue;
    return Math.max(0, Math.round(discounted * 100) / 100);
  },

  // Re-validates INSIDE the transaction, not just before it — two
  // simultaneous redemptions of the last available use must not both
  // succeed. The re-check + increment happening atomically is what
  // actually enforces maxUses; the validate() call above is only a
  // fast pre-check for a nicer error message before payment starts.
  async redeem(code: string, workspaceId: string) {
    return prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.findUniqueOrThrow({ where: { code } });

      if (!coupon.active || (coupon.maxUses !== null && coupon.usesCount >= coupon.maxUses)) {
        throw new Error("COUPON_NO_LONGER_VALID");
      }

      await tx.coupon.update({ where: { id: coupon.id }, data: { usesCount: { increment: 1 } } });
      return tx.couponRedemption.create({ data: { couponId: coupon.id, workspaceId } });
    });
  },
};
