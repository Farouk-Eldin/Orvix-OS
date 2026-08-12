// PROPOSAL — target path: features/ai/services/prompt-version.service.test.ts (new file)

import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirstMock = vi.fn();
const createMock = vi.fn();
const findUniqueMock = vi.fn();
const employeeUpdateMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    promptVersion: {
      findFirst: (...a: unknown[]) => findFirstMock(...a),
      create: (...a: unknown[]) => createMock(...a),
      findUnique: (...a: unknown[]) => findUniqueMock(...a),
    },
    aIEmployee: { update: (...a: unknown[]) => employeeUpdateMock(...a) },
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        promptVersion: {
          findFirst: (...a: unknown[]) => findFirstMock(...a),
          create: (...a: unknown[]) => createMock(...a),
        },
      }),
  },
}));

const SNAPSHOT = {
  personality: "FRIENDLY",
  tone: "ودود",
  language: "AR",
  replyLength: "SHORT",
  emojiUsage: false,
  welcomeMessage: "أهلاً",
  businessDescription: "عيادة أسنان",
  systemInstructions: "لا تذكر الأسعار",
};

describe("promptVersionService.recordVersion", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    createMock.mockReset();
  });

  it("starts at version 1 when no prior version exists", async () => {
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ versionNumber: 1 });

    const { promptVersionService } = await import("./prompt-version.service");
    await promptVersionService.recordVersion("emp1", SNAPSHOT);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ versionNumber: 1 }) })
    );
  });

  it("increments from the latest existing version", async () => {
    findFirstMock.mockResolvedValue({ versionNumber: 4 });
    createMock.mockResolvedValue({ versionNumber: 5 });

    const { promptVersionService } = await import("./prompt-version.service");
    await promptVersionService.recordVersion("emp1", SNAPSHOT);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ versionNumber: 5 }) })
    );
  });
});

describe("promptVersionService.rollback", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    createMock.mockReset();
    findUniqueMock.mockReset();
    employeeUpdateMock.mockReset();
  });

  it("applies the target snapshot to the employee, then records a NEW version (append-only)", async () => {
    findUniqueMock.mockResolvedValue({ id: "v3", versionNumber: 3, snapshot: SNAPSHOT });
    employeeUpdateMock.mockResolvedValue({ id: "emp1", ...SNAPSHOT });
    findFirstMock.mockResolvedValue({ versionNumber: 5 }); // latest before rollback
    createMock.mockResolvedValue({ versionNumber: 6, snapshot: SNAPSHOT });

    const { promptVersionService } = await import("./prompt-version.service");
    await promptVersionService.rollback("emp1", 3, "user1");

    // The employee's live state gets version 3's content...
    expect(employeeUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tone: "ودود" }) })
    );
    // ...but the log grows forward (v6); version 3 itself is never
    // touched or deleted — findUnique proves nothing wrote to v3.
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ versionNumber: 6 }) })
    );
  });

  it("throws a clear error when rolling back to a version that doesn't exist", async () => {
    findUniqueMock.mockResolvedValue(null);
    const { promptVersionService } = await import("./prompt-version.service");

    await expect(promptVersionService.rollback("emp1", 99, "user1")).rejects.toThrow();
    expect(employeeUpdateMock).not.toHaveBeenCalled();
  });
});
