// PROPOSAL — target path: features/admin/services/nps.service.ts (new file)

import { prisma } from "@/lib/prisma";

export const npsService = {
  submit(workspaceId: string, score: number, comment?: string) {
    if (score < 0 || score > 10) throw new Error("الدرجة لازم تكون بين ٠ و ١٠");
    return prisma.npsResponse.create({ data: { workspaceId, score, comment } });
  },

  // Standard NPS formula: %promoters (9-10) minus %detractors (0-6).
  // Result ranges from -100 to 100.
  async getAggregateScore(sinceDays = 90) {
    const responses = await prisma.npsResponse.findMany({
      where: { createdAt: { gte: new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000) } },
      select: { score: true },
    });

    if (responses.length === 0) {
      return { npsScore: null, totalResponses: 0, promoters: 0, passives: 0, detractors: 0 };
    }

    const promoters = responses.filter((r) => r.score >= 9).length;
    const detractors = responses.filter((r) => r.score <= 6).length;
    const passives = responses.length - promoters - detractors;

    const npsScore = Math.round(((promoters - detractors) / responses.length) * 100);

    return { npsScore, totalResponses: responses.length, promoters, passives, detractors };
  },
};
