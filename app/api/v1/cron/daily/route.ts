import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/events/event-bus";

export const runtime = "nodejs";
export const maxDuration = 300;

function daysBetween(a: Date, b: Date) {
  return Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Meant to be hit once a day by an external scheduler (Vercel Cron,
 * GitHub Actions on a schedule, or plain system cron + curl) — there's no
 * scheduler built into the Next.js app itself, this endpoint just needs
 * something to call it.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const results = { analyticsRolledUp: 0, expiringNotified: 0, expired: 0 };

  // --- 1) Yesterday's per-workspace analytics rollup ---
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const workspaces = await prisma.workspace.findMany({ select: { id: true } });

  for (const ws of workspaces) {
    const [messages, aiReplies, knowledgeHits] = await Promise.all([
      prisma.message.count({
        where: { conversation: { workspaceId: ws.id }, createdAt: { gte: yesterday, lte: yesterdayEnd } },
      }),
      prisma.message.count({
        where: {
          conversation: { workspaceId: ws.id },
          aiGenerated: true,
          createdAt: { gte: yesterday, lte: yesterdayEnd },
        },
      }),
      prisma.message.count({
        where: {
          conversation: { workspaceId: ws.id },
          aiGenerated: true,
          confidenceScore: { in: ["HIGH", "MEDIUM"] },
          createdAt: { gte: yesterday, lte: yesterdayEnd },
        },
      }),
    ]);

    if (messages === 0) continue; // no zero-noise rows for idle workspaces

    const avgResponseTime = await prisma.message.aggregate({
      where: {
        conversation: { workspaceId: ws.id },
        aiGenerated: true,
        responseTimeMs: { not: null },
        createdAt: { gte: yesterday, lte: yesterdayEnd },
      },
      _avg: { responseTimeMs: true },
    });

    await prisma.analytics.upsert({
      where: { workspaceId_date: { workspaceId: ws.id, date: yesterday } },
      update: { messages, aiReplies, knowledgeHits, responseTime: avgResponseTime._avg.responseTimeMs },
      create: {
        workspaceId: ws.id,
        date: yesterday,
        messages,
        aiReplies,
        knowledgeHits,
        responseTime: avgResponseTime._avg.responseTimeMs,
      },
    });
    results.analyticsRolledUp++;
  }

  // --- 2) Subscription expiry: warn at 7/3/1 days out, expire once past due ---
  const activeSubs = await prisma.subscription.findMany({
    where: { status: "ACTIVE", renewAt: { not: null } },
  });

  const now = new Date();
  for (const sub of activeSubs) {
    if (!sub.renewAt) continue;
    const daysLeft = daysBetween(sub.renewAt, now);

    if (daysLeft < 0) {
      await prisma.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
      eventBus.emitEvent("PaymentFailed", { workspaceId: sub.workspaceId, reason: "انتهى الاشتراك" });
      results.expired++;
      continue;
    }

    if ([7, 3, 1, 0].includes(daysLeft)) {
      await prisma.notification.create({
        data: {
          workspaceId: sub.workspaceId,
          title: daysLeft === 0 ? "اشتراكك بينتهي النهاردة" : `باقي ${daysLeft} يوم على انتهاء اشتراكك`,
          body: "جدّد دلوقتي عشان مايتوقفش المساعد الذكي.",
          type: "SUBSCRIPTION_EXPIRING",
        },
      });
      results.expiringNotified++;
    }
  }

  return NextResponse.json({ success: true, results, ranAt: now.toISOString() });
}
