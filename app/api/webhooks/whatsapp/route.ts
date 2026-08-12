import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyMetaSignature, handleVerificationHandshake } from "@/lib/channels/meta-webhook-signature";
import { handleIncomingMessage } from "@/features/channels/services/message-handler.service";

export const runtime = "nodejs";

// One-time handshake Meta sends when you register the callback URL.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = handleVerificationHandshake(searchParams, process.env.WHATSAPP_VERIFY_TOKEN ?? "");
  if (result) {
    return new NextResponse(result.challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Every WhatsApp account on the platform can share one callback URL —
  // metadata.phone_number_id in the payload tells us which workspace this
  // event belongs to, so we look the account up before verifying its
  // per-workspace webhook secret against the signature.
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const entry = (payload as any)?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;

  if (!phoneNumberId) {
    // Status/other webhook types we don't act on yet — ack so Meta stops retrying.
    return NextResponse.json({ received: true });
  }

  const account = await prisma.whatsAppAccount.findUnique({ where: { phoneNumberId } });
  if (!account) {
    console.warn(`[whatsapp-webhook] no account registered for phone_number_id ${phoneNumberId}`);
    return NextResponse.json({ received: true });
  }

  const signature = request.headers.get("x-hub-signature-256");
  const isValid = verifyMetaSignature(rawBody, signature, process.env.WHATSAPP_APP_SECRET ?? "");
  if (!isValid) {
    console.error(`[whatsapp-webhook] invalid signature for workspace ${account.workspaceId}`);
    return new NextResponse("Invalid signature", { status: 401 });
  }

  await prisma.webhookLog.create({
    data: { workspaceId: account.workspaceId, provider: "WHATSAPP", payload: payload as object, status: "RECEIVED" },
  });

  const messages = value?.messages as any[] | undefined;
  if (messages?.length) {
    const contactName = value?.contacts?.[0]?.profile?.name as string | undefined;
    for (const message of messages) {
      if (message.type !== "text") continue; // media/interactive handled in a future pass
      try {
        await handleIncomingMessage({
          workspaceId: account.workspaceId,
          channel: "WHATSAPP",
          externalCustomerId: message.from,
          customerName: contactName,
          text: message.text?.body ?? "",
        });
      } catch (error) {
        console.error("[whatsapp-webhook] failed to handle message:", error);
      }
    }
  }

  // Meta requires 200 quickly or it queues retries for up to 7 days.
  return NextResponse.json({ received: true });
}
