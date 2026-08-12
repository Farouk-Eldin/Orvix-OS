// PROPOSAL — target path: features/billing/services/coupon.service.test.ts (new file)

import { describe, it, expect } from "vitest";
import { couponService } from "./coupon.service";

describe("couponService.applyDiscount", () => {
  it("applies a percentage discount correctly", () => {
    expect(couponService.applyDiscount(200, "PERCENTAGE", 25)).toBe(150);
  });

  it("applies a fixed discount correctly", () => {
    expect(couponService.applyDiscount(200, "FIXED", 50)).toBe(150);
  });

  it("never returns a negative price when the fixed discount exceeds the price", () => {
    expect(couponService.applyDiscount(50, "FIXED", 200)).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    expect(couponService.applyDiscount(99.99, "PERCENTAGE", 33)).toBe(66.99);
  });
});
