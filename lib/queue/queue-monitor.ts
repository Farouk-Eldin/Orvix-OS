import { Queue } from "bullmq";

import { createQueueConnection } from "@/lib/queue/connection";
import { FILE_PROCESSING_QUEUE } from "@/lib/queue/file-processing.queue";
import { WEBHOOK_DELIVERY_QUEUE } from "@/lib/queue/webhook-delivery.queue";

const MONITORED_QUEUES = [FILE_PROCESSING_QUEUE, WEBHOOK_DELIVERY_QUEUE];

export interface QueueSnapshot {
  name: string;
  reachable: boolean;
  counts?: { waiting: number; active: number; completed: number; failed: number; delayed: number };
  recentFailures?: { id?: string; name: string; failedReason: string; attemptsMade: number }[];
  error?: string;
}

export async function getQueueSnapshots(): Promise<QueueSnapshot[]> {
  return Promise.all(
    MONITORED_QUEUES.map(async (name): Promise<QueueSnapshot> => {
      const queue = new Queue(name, { connection: createQueueConnection() });
      try {
        const counts = await queue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
        const failedJobs = await queue.getFailed(0, 4);
        return {
          name,
          reachable: true,
          counts: {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
          },
          recentFailures: failedJobs.map((job) => ({
            id: job.id,
            name: job.name,
            failedReason: job.failedReason ?? "—",
            attemptsMade: job.attemptsMade,
          })),
        };
      } catch (error) {
        return { name, reachable: false, error: error instanceof Error ? error.message : "تعذّر الاتصال بالـ Redis" };
      } finally {
        await queue.close().catch(() => {});
      }
    })
  );
}
