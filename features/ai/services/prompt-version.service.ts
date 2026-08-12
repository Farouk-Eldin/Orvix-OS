// PROPOSAL — target path: features/ai/services/prompt-version.service.ts (new file)

import { prisma } from "@/lib/prisma";

export interface PromptSnapshot {
  personality: string;
  tone: string;
  language: string;
  replyLength: string;
  emojiUsage: boolean;
  welcomeMessage: string;
  businessDescription: string;
  systemInstructions: string;
}

export const promptVersionService = {
  // versionNumber is assigned by reading max+1 INSIDE the same
  // transaction as the insert — two saves arriving at nearly the same
  // moment can't both compute "3" and collide on the @@unique
  // constraint against employeeId+versionNumber.
  async recordVersion(employeeId: string, snapshot: PromptSnapshot, createdByUserId?: string) {
    return prisma.$transaction(async (tx) => {
      const last = await tx.promptVersion.findFirst({
        where: { employeeId },
        orderBy: { versionNumber: "desc" },
        select: { versionNumber: true },
      });

      return tx.promptVersion.create({
        data: {
          employeeId,
          versionNumber: (last?.versionNumber ?? 0) + 1,
          snapshot: snapshot as never,
          createdByUserId,
        },
      });
    });
  },

  listVersions(employeeId: string) {
    return prisma.promptVersion.findMany({
      where: { employeeId },
      orderBy: { versionNumber: "desc" },
      include: { createdBy: { select: { name: true } } },
    });
  },

  getVersion(employeeId: string, versionNumber: number) {
    return prisma.promptVersion.findUnique({ where: { employeeId_versionNumber: { employeeId, versionNumber } } });
  },

  // Applies an old snapshot as the employee's current state, then
  // records THAT as a new version too — the version log is append-only,
  // "restore v3" becomes v6 with v3's content, v3 itself is untouched.
  async rollback(employeeId: string, versionNumber: number, restoredByUserId?: string) {
    const target = await this.getVersion(employeeId, versionNumber);
    if (!target) throw new Error("النسخة دي مش موجودة");

    const snapshot = target.snapshot as unknown as PromptSnapshot;

    const updated = await prisma.aIEmployee.update({
      where: { id: employeeId },
      data: {
        personality: snapshot.personality as never,
        tone: snapshot.tone,
        language: snapshot.language as never,
        replyLength: snapshot.replyLength as never,
        emojiUsage: snapshot.emojiUsage,
        welcomeMessage: snapshot.welcomeMessage,
        businessDescription: snapshot.businessDescription,
        systemInstructions: snapshot.systemInstructions,
      },
    });

    await this.recordVersion(employeeId, snapshot, restoredByUserId);
    return updated;
  },
};
