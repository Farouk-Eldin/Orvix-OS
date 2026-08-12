// PROPOSAL — target path: prisma/seed-workflow-templates.ts (new file, run separately from the main seed)
// Run with: npx tsx prisma/seed-workflow-templates.ts
//
// Honest scope: only 2 of the doc's named examples are buildable as
// TRUE zero-config templates — every other named example (Clinic
// Booking, Restaurant Reservation, Abandoned Cart, Missed Appointment)
// fundamentally needs a real serviceId/resourceId to do anything useful,
// which doesn't exist until installed into a specific workspace. Those
// are better built as starting shapes the person finishes wiring up
// (fully supported by install() already), not pretended into "one-click
// ready" templates here.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.workflowTemplate.upsert({
    where: { id: "official-customer-support" },
    update: {},
    create: {
      id: "official-customer-support",
      name: "رد فوري على استفسارات العملاء",
      description: "لما عميل يبعت رسالة، الذكاء الاصطناعي يرد فورًا من غير ما يستنى دورة الرد العادية.",
      category: "customer_support",
      isOfficial: true,
      graphSnapshot: {
        nodes: [
          { clientId: "trigger", type: "TRIGGER_MESSAGE_RECEIVED", config: {}, positionX: 400, positionY: 100 },
          {
            clientId: "reply",
            type: "AI_GENERATE_REPLY",
            config: { prompt: "{{trigger.text}}", systemPrompt: "رد بإيجاز واحترافية باللغة اللي كتب بيها العميل." },
            positionX: 150,
            positionY: 100,
          },
        ],
        edges: [{ fromClientId: "trigger", toClientId: "reply" }],
      },
    },
  });

  await prisma.workflowTemplate.upsert({
    where: { id: "official-payment-reminder" },
    update: {},
    create: {
      id: "official-payment-reminder",
      name: "تذكير بالدفع بعد فشل المحاولة",
      description: "لما حجز يتغيّر لحالة معيّنة، يتبعت إشعار داخلي للفريق يتابع مع العميل.",
      category: "payment_reminder",
      isOfficial: true,
      graphSnapshot: {
        nodes: [
          { clientId: "trigger", type: "TRIGGER_BOOKING_STATUS_CHANGED", config: {}, positionX: 550, positionY: 100 },
          {
            clientId: "cond",
            type: "CONDITION_IF",
            config: { field: "trigger.status", value: "CANCELLED" },
            positionX: 350,
            positionY: 100,
          },
          {
            clientId: "notify",
            type: "ACTION_SEND_NOTIFICATION",
            config: { title: "حجز اتلغى", message: "حجز رقم {{trigger.bookingId}} اتلغى — يستاهل متابعة." },
            positionX: 130,
            positionY: 60,
          },
        ],
        edges: [
          { fromClientId: "trigger", toClientId: "cond" },
          { fromClientId: "cond", toClientId: "notify", branch: "true" },
        ],
      },
    },
  });

  console.log("✅ Official workflow templates seeded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
