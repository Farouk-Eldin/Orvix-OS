import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyMetaSignature, handleVerificationHandshake } from "@/lib/channels/meta-webhook-signature";
import { handleIncomingMessage } from "@/features/channels/services/message-handler.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = process.env.INSTAGRAM_VERIFY_TOKEN;
  const result = handleVerificationHandshake(searchParams, token ?? "");
  if (result) {
    return new NextResponse(result.challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signature = request.headers.get("x-hub-signature-256");
  const isValid = verifyMetaSignature(rawBody, signature, process.env.INSTAGRAM_APP_SECRET ?? "");
  if (!isValid) {
    console.error("[instagram-webhook] invalid signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  if ((payload as any)?.object !== "instagram") {
    return NextResponse.json({ received: true });
  }

  const entries = (payload as any).entry as any[];
  for (const entry of entries ?? []) {
    const igAccountId: string | undefined = entry.id;
    if (!igAccountId) continue;

    const account = await prisma.instagramAccount.findUnique({ where: { instagramId: igAccountId } });
    if (!account) {
      console.warn(`[instagram-webhook] no account registered for ${igAccountId}`);
      continue;
    }

    await prisma.webhookLog.create({
      data: { workspaceId: account.workspaceId, provider: "INSTAGRAM", payload: entry, status: "RECEIVED" },
    });

    for (const event of entry.messaging ?? []) {
      const text = event.message?.text as string | undefined;
      const senderId = event.sender?.id as string | undefined;
      if (!text || !senderId || event.message?.is_echo) continue;

      try {
        await handleIncomingMessage({
          workspaceId: account.workspaceId,
          channel: "INSTAGRAM",
          externalCustomerId: senderId,
          text,
        });
      } catch (error) {
        console.error("[instagram-webhook] failed to handle message:", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
