// PROPOSAL — target path: features/ai/services/prompt-experiment.service.test.ts (new file)

import { describe, it, expect, vi, beforeEach } from "vitest";

const findUniqueAssignment = vi.fn();
const createAssignment = vi.fn();
const findManyAssignments = vi.fn();
const messageAggregate = vi.fn();
const bookingFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    promptExperimentAssignment: {
      findUnique: (...a: unknown[]) => findUniqueAssignment(...a),
      create: (...a: unknown[]) => createAssignment(...a),
      findMany: (...a: unknown[]) => findManyAssignments(...a),
    },
    message: { aggregate: (...a: unknown[]) => messageAggregate(...a) },
    booking: { findFirst: (...a: unknown[]) => bookingFindFirst(...a) },
    promptExperiment: { findFirst: vi.fn() },
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        promptExperimentAssignment: {
          findUnique: (...a: unknown[]) => findUniqueAssignment(...a),
          create: (...a: unknown[]) => createAssignment(...a),
        },
      }),
  },
}));

describe("promptExperimentService.assignVariant", () => {
  beforeEach(() => {
    findUniqueAssignment.mockReset();
    createAssignment.mockReset();
  });

  it("returns the existing assignment instead of rolling a new variant (sticky)", async () => {
    findUniqueAssignment.mockResolvedValue({ id: "a1", conversationId: "conv1", variant: "B" });
    const { promptExperimentService } = await import("./prompt-experiment.service");

    const result = await promptExperimentService.assignVariant("exp1", "conv1", 50);

    expect(result.variant).toBe("B");
    expect(createAssignment).not.toHaveBeenCalled();
  });

  it("creates a new assignment when none exists yet", async () => {
    findUniqueAssignment.mockResolvedValue(null);
    createAssignment.mockResolvedValue({ id: "a2", conversationId: "conv2", variant: "A" });
    const { promptExperimentService } = await import("./prompt-experiment.service");

    await promptExperimentService.assignVariant("exp1", "conv2", 50);

    expect(createAssignment).toHaveBeenCalledTimes(1);
  });

  it("always assigns A when trafficSplitPercent is 0", async () => {
    findUniqueAssignment.mockResolvedValue(null);
    createAssignment.mockImplementation(({ data }: { data: { variant: string } }) => Promise.resolve(data));
    const { promptExperimentService } = await import("./prompt-experiment.service");

    const result = await promptExperimentService.assignVariant("exp1", "conv3", 0);
    expect(result.variant).toBe("A");
  });
});

describe("promptExperimentService.getResults", () => {
  beforeEach(() => {
    findManyAssignments.mockReset();
    messageAggregate.mockReset();
    bookingFindFirst.mockReset();
  });

  it("returns zeroed results for a variant with no assignments", async () => {
    findManyAssignments.mockResolvedValue([
      { conversationId: "c1", variant: "A", createdAt: new Date(), conversation: { customerId: "cust1" } },
    ]);
    messageAggregate.mockResolvedValue({ _avg: { responseTimeMs: 1200 } });
    bookingFindFirst.mockResolvedValue(null);

    const { promptExperimentService } = await import("./prompt-experiment.service");
    const results = await promptExperimentService.getResults("exp1");

    expect(results.variantB.conversationCount).toBe(0);
    expect(results.variantB.bookingConversionRate).toBeNull();
  });

  it("computes booking conversion rate as a percentage of assigned conversations", async () => {
    findManyAssignments.mockResolvedValue([
      { conversationId: "c1", variant: "A", createdAt: new Date(), conversation: { customerId: "cust1" } },
      { conversationId: "c2", variant: "A", createdAt: new Date(), conversation: { customerId: "cust2" } },
    ]);
    messageAggregate.mockResolvedValue({ _avg: { responseTimeMs: 900 } });
    bookingFindFirst
      .mockResolvedValueOnce({ id: "b1" }) // cust1 converted
      .mockResolvedValueOnce(null); // cust2 didn't

    const { promptExperimentService } = await import("./prompt-experiment.service");
    const results = await promptExperimentService.getResults("exp1");

    expect(results.variantA.conversationCount).toBe(2);
    expect(results.variantA.bookingConversionRate).toBe(50);
    expect(results.variantA.avgResponseTimeMs).toBe(900);
  });
});
