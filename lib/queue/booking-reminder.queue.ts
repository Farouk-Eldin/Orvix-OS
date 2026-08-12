import { Queue } from "bullmq";

import { createQueueConnection } from "@/lib/queue/connection";

export const BOOKING_REMINDER_QUEUE = "booking-reminder";

export type ReminderOffset = "24H" | "12H" | "2H" | "30M";

export interface BookingReminderJobData {
  bookingId: string;
  offset: ReminderOffset;
}

const OFFSET_MS: Record<ReminderOffset, number> = {
  "24H": 24 * 60 * 60 * 1000,
  "12H": 12 * 60 * 60 * 1000,
  "2H": 2 * 60 * 60 * 1000,
  "30M": 30 * 60 * 1000,
};

let queueInstance: Queue<BookingReminderJobData> | null = null;

function getQueue() {
  if (!queueInstance) {
    queueInstance = new Queue<BookingReminderJobData>(BOOKING_REMINDER_QUEUE, {
      connection: createQueueConnection(),
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 60_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return queueInstance;
}

/**
 * Schedules whichever of the four reminder offsets still fall in the
 * future relative to the booking's start time. A booking made 3 hours
 * out only gets the 2h and 30m reminders — the 24h/12h ones would fire
 * in the past, so they're never queued at all rather than firing
 * immediately and confusing the customer.
 */
export async function scheduleBookingReminders(bookingId: string, startAt: Date) {
  const queue = getQueue();
  const now = Date.now();

  for (const [offset, offsetMs] of Object.entries(OFFSET_MS) as [ReminderOffset, number][]) {
    const fireAt = startAt.getTime() - offsetMs;
    const delay = fireAt - now;
    if (delay <= 0) continue;

    await queue.add(
      `reminder-${offset}`,
      { bookingId, offset },
      { delay, jobId: `${bookingId}-${offset}` } // stable id — rescheduling the same booking+offset just replaces it, never duplicates
    );
  }
}

export async function cancelBookingReminders(bookingId: string) {
  const queue = getQueue();
  for (const offset of Object.keys(OFFSET_MS) as ReminderOffset[]) {
    const job = await queue.getJob(`${bookingId}-${offset}`);
    if (job) await job.remove();
  }
}
