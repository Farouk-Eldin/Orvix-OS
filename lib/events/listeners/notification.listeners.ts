import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/events/event-bus";

/**
 * Neither the knowledge-base pipeline nor the Paymob webhook needs to know
 * a Notification row exists — they just emit what happened, and this
 * listener decides what to do about it. Add a new reaction (email, Slack
 * ping, analytics rollup) by adding a listener here, never by editing the
 * module that emits the event.
 */
export function registerNotificationListeners() {
  eventBus.onEvent("KnowledgeUploaded", async ({ workspaceId, chunksCreated }) => {
    await prisma.notification.create({
      data: {
        workspaceId,
        title: "قاعدة المعرفة اتحدّثت",
        body: `تمت إضافة ${chunksCreated} جزء جديد قابل للبحث.`,
        type: "KNOWLEDGE_READY",
      },
    });
  });

  eventBus.onEvent("SubscriptionActivated", async ({ workspaceId }) => {
    await prisma.notification.create({
      data: {
        workspaceId,
        title: "تم تفعيل الاشتراك",
        body: "خطتك الشهرية اتفعّلت — كل الميزات متاحة دلوقتي.",
        type: "PAYMENT_SUCCESS",
      },
    });
  });

  eventBus.onEvent("PaymentFailed", async ({ workspaceId, reason }) => {
    await prisma.notification.create({
      data: {
        workspaceId,
        title: "فشلت عملية الدفع",
        body: reason || "حاول تاني أو استخدم وسيلة دفع مختلفة.",
        type: "PAYMENT_FAILED",
      },
    });
  });

  // Only the admin -> workspace direction becomes an in-app notification —
  // a workspace replying to its own ticket doesn't need to notify itself.
  eventBus.onEvent("SupportTicketReplied", async ({ workspaceId, ticketId, isAdminReply }) => {
    if (!isAdminReply) return;
    await prisma.notification.create({
      data: {
        workspaceId,
        title: "ردّ فريق الدعم على تذكرتك",
        body: "في ردّ جديد على تذكرة الدعم الفني بتاعتك.",
        type: "SUPPORT_TICKET_REPLY",
        data: { ticketId },
      },
    });
  });
}
