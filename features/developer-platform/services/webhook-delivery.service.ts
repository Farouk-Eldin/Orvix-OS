// PROPOSAL — target path: features/developer-platform/services/webhook-delivery.service.ts (new file)

import { createHmac } from "crypto";

import { prisma } from "@/lib/prisma";

// Throws on any non-2xx or network failure — BullMQ's `attempts` +
// `backoff` (configured in webhook-delivery.queue.ts) does the actual
// retrying. This function only needs to try once and report honestly.
export async function deliverWebhook(subscriptionId: string, deliveryId: string) {
  const [subscription, delivery] = await Promise.all([
    prisma.webhookSubscription.findUniqueOrThrow({ where: { id: subscriptionId } }),
    prisma.webhookDelivery.findUniqueOrThrow({ where: { id: deliveryId } }),
  ]);

  if (!subscription.active) {
    await prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status: "FAILED", responseCode: null } });
    return;
  }

  const body = JSON.stringify({ event: delivery.event, data: delivery.payload });
  const signature = createHmac("sha256", subscription.secret).update(body).digest("hex");

  const response = await fetch(subscription.endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Orvix-Signature": signature,
      "X-Orvix-Event": delivery.event,
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: response.ok ? "DELIVERED" : "FAILED",
      responseCode: response.status,
      attempt: { increment: 1 },
    },
  });

  if (!response.ok) {
    throw new Error(`webhook endpoint returned ${response.status}`);
  }
}
