import { Resend } from "resend";

import { prisma } from "@/lib/prisma";

const globalForResend = globalThis as unknown as { resend: Resend | undefined };

function buildClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const resend = globalForResend.resend ?? buildClient();
if (process.env.NODE_ENV !== "production" && resend) {
  globalForResend.resend = resend;
}

export async function sendTransactionalEmail(params: {
  workspaceId: string | null;
  to: string;
  subject: string;
  html: string;
  type:
    | "WELCOME"
    | "PAYMENT_SUCCESS"
    | "PAYMENT_FAILED"
    | "SUBSCRIPTION_EXPIRING"
    | "SUBSCRIPTION_EXPIRED"
    | "KNOWLEDGE_PROCESSING_FINISHED"
    | "SUPPORT_TICKET_CREATED"
    | "SUPPORT_TICKET_REPLY"
    | "BROADCAST_ANNOUNCEMENT";
}) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${params.type}" email to ${params.to}`);
    await prisma.emailLog.create({
      data: {
        workspaceId: params.workspaceId,
        recipientEmail: params.to,
        type: params.type,
        status: "FAILED",
      },
    });
    return { sent: false };
  }

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "noreply@orvix.os",
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    await prisma.emailLog.create({
      data: {
        workspaceId: params.workspaceId,
        recipientEmail: params.to,
        type: params.type,
        status: result.error ? "FAILED" : "SENT",
        resendId: result.data?.id,
      },
    });

    return { sent: !result.error };
  } catch (error) {
    console.error(`[email] failed to send "${params.type}" to ${params.to}:`, error);
    await prisma.emailLog.create({
      data: { workspaceId: params.workspaceId, recipientEmail: params.to, type: params.type, status: "FAILED" },
    });
    return { sent: false };
  }
}
