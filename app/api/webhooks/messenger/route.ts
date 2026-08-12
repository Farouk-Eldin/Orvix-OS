import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyMetaSignature, handleVerificationHandshake } from "@/lib/channels/meta-webhook-signature";
import { handleIncomingMessage } from "@/features/channels/services/message-handler.service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = handleVerificationHandshake(searchParams, process.env.FACEBOOK_VERIFY_TOKEN ?? "");
  if (result) {
    return new NextResponse(result.challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const signature = request.headers.get("x-hub-signature-256");
  const isValid = verifyMetaSignature(rawBody, signature, process.env.FACEBOOK_APP_SECRET ?? "");
  if (!isValid) {
    console.error("[messenger-webhook] invalid signature");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  if ((payload as any)?.object !== "page") {
    return NextResponse.json({ received: true });
  }

  const entries = (payload as any).entry as any[];
  for (const entry of entries ?? []) {
    const pageId: string | undefined = entry.id;
    if (!pageId) continue;

    const account = await prisma.facebookPage.findUnique({ where: { pageId } });
    if (!account) {
      console.warn(`[messenger-webhook] no page registered for pageId ${pageId}`);
      continue;
    }

    await prisma.webhookLog.create({
      data: { workspaceId: account.workspaceId, provider: "FACEBOOK", payload: entry, status: "RECEIVED" },
    });

    for (const event of entry.messaging ?? []) {
      const text = event.message?.text as string | undefined;
      const senderId = event.sender?.id as string | undefined;
      // is_echo marks messages the Page itself sent (e.g. from Business
      // Suite) — never treat our own outgoing messages as new customer input.
      if (!text || !senderId || event.message?.is_echo) continue;

      try {
        await handleIncomingMessage({
          workspaceId: account.workspaceId,
          channel: "FACEBOOK",
          externalCustomerId: senderId,
          text,
        });
      } catch (error) {
        console.error("[messenger-webhook] failed to handle message:", error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
