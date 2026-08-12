// PROPOSAL — target path: features/ai/services/prompt-experiment.service.ts (new file)

import { prisma } from "@/lib/prisma";
import type { PromptSnapshot } from "@/features/ai/services/prompt-version.service";

export const promptExperimentService = {
  getActiveExperiment(employeeId: string) {
    return prisma.promptExperiment.findFirst({ where: { employeeId, status: "RUNNING" } });
  },

  // Sticky by conversationId: read-or-create inside a transaction so two
  // messages arriving in the same new conversation nearly simultaneously
  // can't roll two different variants for it.
  async assignVariant(experimentId: string, conversationId: string, trafficSplitPercent: number) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.promptExperimentAssignment.findUnique({ where: { conversationId } });
      if (existing) return existing;

      const variant: "A" | "B" = Math.random() * 100 < trafficSplitPercent ? "B" : "A";
      return tx.promptExperimentAssignment.create({ data: { experimentId, conversationId, variant } });
    });
  },

  async create(params: {
    workspaceId: string;
    employeeId: string;
    name: string;
    variantASnapshot: PromptSnapshot;
    variantBSnapshot: PromptSnapshot;
    trafficSplitPercent?: number;
  }) {
    const alreadyRunning = await this.getActiveExperiment(params.employeeId);
    if (alreadyRunning) {
      throw new Error("فيه تجربة شغالة بالفعل لهذا الموظف — أوقفها الأول قبل ما تبدأ واحدة جديدة");
    }

    return prisma.promptExperiment.create({
      data: {
        workspaceId: params.workspaceId,
        employeeId: params.employeeId,
        name: params.name,
        variantASnapshot: params.variantASnapshot as never,
        variantBSnapshot: params.variantBSnapshot as never,
        trafficSplitPercent: params.trafficSplitPercent ?? 50,
      },
    });
  },

  start(experimentId: string) {
    return prisma.promptExperiment.update({
      where: { id: experimentId },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  },

  // Stopping optionally applies the winner as the employee's live
  // config — reuses promptVersionService so that switch is itself
  // recorded as a new version, same as any manual save.
  async stop(experimentId: string, winnerVariant?: "A" | "B") {
    const experiment = await prisma.promptExperiment.update({
      where: { id: experimentId },
      data: { status: "COMPLETED", endedAt: new Date(), winnerVariant },
    });

    if (winnerVariant) {
      const snapshot = (
        winnerVariant === "A" ? experiment.variantASnapshot : experiment.variantBSnapshot
      ) as unknown as PromptSnapshot;

      await prisma.aIEmployee.update({
        where: { id: experiment.employeeId },
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
    }

    return experiment;
  },

  /**
   * Results are computed on read from real tables (Booking, Message),
   * not accumulated in a separate metrics table that could drift —
   * same reasoning as the onboarding checklist.
   *
   * Caveat, stated plainly: booking-conversion is checked with one
   * query per assignment rather than a single grouped query, since it
   * needs "does THIS customer have a booking created after THIS
   * assignment's timestamp" per row. Fine for realistic experiment
   * sizes (tens to low hundreds of conversations); a large-scale
   * version would push this into a single SQL query instead of
   * Prisma's client API — not done here, out of this milestone's scope.
   */
  async getResults(experimentId: string) {
    const assignments = await prisma.promptExperimentAssignment.findMany({
      where: { experimentId },
      include: { conversation: { select: { customerId: true } } },
    });

    async function summarize(variant: "A" | "B") {
      const rows = assignments.filter((a) => a.variant === variant);
      if (rows.length === 0) {
        return { conversationCount: 0, avgResponseTimeMs: null, bookingConversionRate: null };
      }

      const conversationIds = rows.map((r) => r.conversationId);

      const responseTimeAgg = await prisma.message.aggregate({
        where: { conversationId: { in: conversationIds }, sender: "AI", responseTimeMs: { not: null } },
        _avg: { responseTimeMs: true },
      });

      const conversions = await Promise.all(
        rows.map((r) =>
          prisma.booking.findFirst({
            where: { customerId: r.conversation.customerId, createdAt: { gte: r.createdAt } },
            select: { id: true },
          })
        )
      );

      return {
        conversationCount: rows.length,
        avgResponseTimeMs: responseTimeAgg._avg.responseTimeMs,
        bookingConversionRate: Math.round((conversions.filter(Boolean).length / rows.length) * 100),
      };
    }

    const [variantA, variantB] = await Promise.all([summarize("A"), summarize("B")]);
    return { variantA, variantB };
  },
};
