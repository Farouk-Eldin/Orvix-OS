// PROPOSAL — target path: features/billing/services/credits.service.test.ts (new file)

import { describe, it, expect, vi, beforeEach } from "vitest";

const aggregateMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creditTransaction: {
      aggregate: (...args: unknown[]) => aggregateMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        creditTransaction: {
          aggregate: (...args: unknown[]) => aggregateMock(...args),
          create: (...args: unknown[]) => createMock(...args),
        },
      }),
  },
}));

describe("creditsService", () => {
  beforeEach(() => {
    aggregateMock.mockReset();
    createMock.mockReset();
  });

  it("getBalance sums the ledger, defaulting to 0 with no transactions", async () => {
    aggregateMock.mockResolvedValue({ _sum: { amount: null } });
    const { creditsService } = await import("./credits.service");
    expect(await creditsService.getBalance("ws1")).toBe(0);
  });

  it("spend succeeds and writes a negative amount when balance covers it", async () => {
    aggregateMock.mockResolvedValue({ _sum: { amount: 10 } });
    createMock.mockResolvedValue({ id: "tx1", amount: -3 });
    const { creditsService } = await import("./credits.service");

    await creditsService.spend("ws1", 3, "AI_MESSAGE_SPEND");
    expect(createMock).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: -3 }) });
  });

  it("spend throws INSUFFICIENT_CREDITS and writes nothing when balance is too low", async () => {
    aggregateMock.mockResolvedValue({ _sum: { amount: 2 } });
    const { creditsService } = await import("./credits.service");

    await expect(creditsService.spend("ws1", 5, "AI_MESSAGE_SPEND")).rejects.toThrow("INSUFFICIENT_CREDITS");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("grant rejects a non-positive amount without touching the database", async () => {
    const { creditsService } = await import("./credits.service");
    await expect(creditsService.grant("ws1", 0, "ADMIN_GRANT")).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });
});
