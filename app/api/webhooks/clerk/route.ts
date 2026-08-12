import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";

import { userRepository } from "@/lib/repositories/user.repository";

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const webhook = new Webhook(webhookSecret);

  let event: WebhookEvent;
  try {
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("Clerk webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "user.created": {
        const { id, email_addresses, first_name, last_name, image_url } = event.data;
        const email = email_addresses[0]?.email_address;
        const existing = await userRepository.findByClerkId(id);
        if (email && !existing) {
          await userRepository.create({
            clerkId: id,
            name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || "مستخدم جديد",
            email,
            avatar: image_url,
          });
        }
        break;
      }
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } = event.data;
        const existing = await userRepository.findByClerkId(id);
        if (existing) {
          await userRepository.update(existing.id, {
            name: `${first_name ?? ""} ${last_name ?? ""}`.trim() || existing.name,
            email: email_addresses[0]?.email_address ?? existing.email,
            avatar: image_url,
          });
        }
        break;
      }
      case "user.deleted": {
        if (event.data.id) {
          await userRepository.delete(event.data.id).catch(() => null);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error(`Failed processing Clerk webhook "${event.type}":`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
