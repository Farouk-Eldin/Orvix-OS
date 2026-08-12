// PROPOSAL — target path: lib/queue/webhook-delivery.queue.ts (new file)
// Same shape as file-processing.queue.ts on purpose — one more queue,
// same conventions, nothing new to learn.

import { Queue } from "bullmq";

import { createQueueConnection } from "@/lib/queue/connection";

export const WEBHOOK_DELIVERY_QUEUE = "webhook-delivery";

export interface WebhookDeliveryJobData {
  subscriptionId: string;
  deliveryId: string;
}

let queueInstance: Queue<WebhookDeliveryJobData> | null = null;

function getQueue() {
  if (!queueInstance) {
    queueInstance = new Queue<WebhookDeliveryJobData>(WEBHOOK_DELIVERY_QUEUE, {
      connection: createQueueConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
      },
    });
  }
  return queueInstance;
}

export async function enqueueWebhookDelivery(data: WebhookDeliveryJobData) {
  return getQueue().add("deliver", data);
}
