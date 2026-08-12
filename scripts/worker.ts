// PROPOSAL — target path: scripts/worker.ts (replaces existing file)
// Only addition: a second Worker instance for webhook deliveries,
// alongside the existing file-processing one. Same process, same
// connection factory, same shutdown handling.

import { Worker, type Job } from "bullmq";

import { createQueueConnection } from "@/lib/queue/connection";
import { FILE_PROCESSING_QUEUE, type FileProcessingJobData } from "@/lib/queue/file-processing.queue";
import { processKnowledgeFile } from "@/features/knowledge-base/services/file-processing.service";
import { WEBHOOK_DELIVERY_QUEUE, type WebhookDeliveryJobData } from "@/lib/queue/webhook-delivery.queue";
import { deliverWebhook } from "@/features/developer-platform/services/webhook-delivery.service";
import { BOOKING_REMINDER_QUEUE, type BookingReminderJobData, type ReminderOffset } from "@/lib/queue/booking-reminder.queue";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { sendChannelMessage } from "@/lib/channels/send-message";

const fileWorker = new Worker<FileProcessingJobData>(
  FILE_PROCESSING_QUEUE,
  async (job: Job<FileProcessingJobData>) => {
    console.log(`[worker] processing file ${job.data.fileId} (workspace ${job.data.workspaceId})`);
    const result = await processKnowledgeFile(job.data);
    if (!result.success) {
      throw new Error(result.error ?? "معالجة الملف فشلت");
    }
    return result;
  },
  { connection: createQueueConnection(), concurrency: 4 }
);

const webhookWorker = new Worker<WebhookDeliveryJobData>(
  WEBHOOK_DELIVERY_QUEUE,
  async (job: Job<WebhookDeliveryJobData>) => {
    console.log(`[worker] delivering webhook ${job.data.deliveryId} (attempt ${job.attemptsMade + 1})`);
    await deliverWebhook(job.data.subscriptionId, job.data.deliveryId);
  },
  { connection: createQueueConnection(), concurrency: 10 }
);

const OFFSET_LABEL_AR: Record<ReminderOffset, string> = {
  "24H": "24 ساعة",
  "12H": "12 ساعة",
  "2H": "ساعتين",
  "30M": "نص ساعة",
};

const bookingReminderWorker = new Worker<BookingReminderJobData>(
  BOOKING_REMINDER_QUEUE,
  async (job: Job<BookingReminderJobData>) => {
    const booking = await bookingRepository.findByIdWithDetails(job.data.bookingId);
    // The booking may have been cancelled/rescheduled after this job was
    // queued — cancelBookingReminders() removes the job in that case,
    // but if it's already in-flight, this is the second line of defense.
    if (!booking || booking.status === "CANCELLED" || booking.status === "COMPLETED") return;

    const target =
      booking.channel === "WHATSAPP"
        ? booking.customer.phone
        : booking.channel === "FACEBOOK"
          ? booking.customer.facebookId
          : booking.customer.instagramId;
    if (!target) return;

    const timeLabel = booking.startAt.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const message = `تذكير: عندك موعد "${booking.service.name}" بعد ${OFFSET_LABEL_AR[job.data.offset]} الساعة ${timeLabel}.`;

    await sendChannelMessage({ workspaceId: booking.workspaceId, channel: booking.channel, externalCustomerId: target }, message);
    console.log(`[worker] sent ${job.data.offset} reminder for booking ${booking.id}`);
  },
  { connection: createQueueConnection(), concurrency: 5 }
);

fileWorker.on("completed", (job) => console.log(`[worker] ✅ file done: ${job.id}`));
fileWorker.on("failed", (job, error) => console.error(`[worker] ❌ file failed: ${job?.id}`, error));
webhookWorker.on("completed", (job) => console.log(`[worker] ✅ webhook delivered: ${job.id}`));
webhookWorker.on("failed", (job, error) => console.error(`[worker] ❌ webhook failed: ${job?.id}`, error.message));
bookingReminderWorker.on("completed", (job) => console.log(`[worker] ✅ reminder sent: ${job.id}`));
bookingReminderWorker.on("failed", (job, error) => console.error(`[worker] ❌ reminder failed: ${job?.id}`, error.message));

console.log("[worker] file-processing + webhook-delivery + booking-reminder workers started, waiting for jobs...");

process.on("SIGTERM", async () => {
  await Promise.all([fileWorker.close(), webhookWorker.close(), bookingReminderWorker.close()]);
  process.exit(0);
});
