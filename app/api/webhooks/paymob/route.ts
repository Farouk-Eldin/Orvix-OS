import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyPaymobHmac } from "@/lib/payments/paymob-hmac";
import { eventBus } from "@/lib/events/event-bus";

export const runtime = "nodejs";

function addOneMonth(date: Date) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  // Paymob sends the HMAC as a query param on the callback URL, unlike
  // Meta's header-based signing — easy to miss if you only check headers.
  const receivedHmac = searchParams.get("hmac");

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const transaction = payload?.obj;
  if (!transaction) {
    return NextResponse.json({ received: true });
  }

  const isValid = verifyPaymobHmac(transaction, receivedHmac);
  if (!isValid) {
    console.error("[paymob-webhook] HMAC verification failed — ignoring callback");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  // Trace the callback back to the PaymentLog we created at checkout time.
  // Paymob's exact field for our special_reference varies by integration
  // path, so we try every place it's been seen to appear before giving up.
  const reference: string | undefined =
    transaction.order?.merchant_order_id ??
    transaction.merchant_order_id ??
    transaction.special_reference ??
    transaction.order?.special_reference;
  const paymobOrderId = String(transaction.order?.id ?? transaction.order ?? "");

  const paymentLog = await prisma.paymentLog.findFirst({
    where: {
      OR: [
        reference ? { invoiceNumber: reference } : undefined,
        paymobOrderId ? { paymobOrderId } : undefined,
      ].filter(Boolean) as any,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (!paymentLog) {
    console.error("[paymob-webhook] verified callback but no matching PENDING PaymentLog found", {
      reference,
      paymobOrderId,
    });
    return NextResponse.json({ received: true });
  }

  const success = Boolean(transaction.success) && !transaction.pending && !transaction.error_occured;
  const transactionId = String(transaction.id ?? "");
  const paymentMethod = mapSourceType(transaction.source_data?.sub_type ?? transaction.source_data?.type);

  await prisma.$transaction(async (tx) => {
    await tx.paymentLog.update({
      where: { id: paymentLog.id },
      data: {
        status: success ? "PAID" : "FAILED",
        transactionId,
        paymentMethod,
      },
    });

    if (success) {
      const now = new Date();
      await tx.subscription.update({
        where: { id: paymentLog.subscriptionId ?? undefined, workspaceId: paymentLog.workspaceId },
        data: { plan: "PRO", status: "ACTIVE", renewAt: addOneMonth(now) },
      });
    }
  });

  if (success) {
    eventBus.emitEvent("PaymentSucceeded", {
      workspaceId: paymentLog.workspaceId,
      amount: Number(paymentLog.amount),
      transactionId,
    });
    eventBus.emitEvent("SubscriptionActivated", { workspaceId: paymentLog.workspaceId, plan: "PRO" });
  } else {
    eventBus.emitEvent("PaymentFailed", {
      workspaceId: paymentLog.workspaceId,
      reason: "الدفع لم يكتمل أو اتلغى",
    });
  }

  return NextResponse.json({ received: true });
}

function mapSourceType(value: string | undefined) {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized.includes("visa")) return "VISA";
  if (normalized.includes("master")) return "MASTERCARD";
  if (normalized.includes("meeza")) return "MEEZA";
  if (normalized.includes("vodafone")) return "VODAFONE_CASH";
  if (normalized.includes("orange")) return "ORANGE_CASH";
  if (normalized.includes("etisalat")) return "ETISALAT_CASH";
  return undefined;
}
