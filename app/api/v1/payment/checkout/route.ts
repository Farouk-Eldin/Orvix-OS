import { randomUUID } from "crypto";

import {
  requireWorkspace,
  UnauthorizedError,
  NoWorkspaceError,
} from "@/features/authentication/services/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { createPaymentIntention, buildUnifiedCheckoutUrl } from "@/lib/payments/paymob-client";
import { siteConfig } from "@/config/site";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

export async function POST() {
  try {
    const { workspace, user } = await requireWorkspace();

    const amountCents = siteConfig.subscription.priceEGP * 100;
    const specialReference = `orvix_${workspace.id}_${randomUUID().slice(0, 8)}`;

    const [firstName, ...rest] = user.name.trim().split(" ");

    const intention = await createPaymentIntention({
      amountCents,
      currency: "EGP",
      specialReference,
      billingData: {
        firstName: firstName || "عميل",
        lastName: rest.join(" ") || "Orvix",
        email: user.email,
        phoneNumber: "+201000000000", // collected properly once a dedicated billing-details step exists
      },
      notificationUrl: `${siteConfig.url}/api/webhooks/paymob`,
      redirectionUrl: `${siteConfig.url}/dashboard/subscription?checkout=complete`,
    });

    if (!intention.success) {
      return apiError("متقدرش نبدأ عملية الدفع", [intention.error], 502);
    }

    await prisma.paymentLog.create({
      data: {
        workspaceId: workspace.id,
        subscriptionId: (await prisma.subscription.findUnique({ where: { workspaceId: workspace.id } }))?.id,
        amount: siteConfig.subscription.priceEGP,
        currency: "EGP",
        status: "PENDING",
        paymobOrderId: intention.intentionId,
        invoiceNumber: specialReference,
      },
    });

    return apiSuccess({ checkoutUrl: buildUnifiedCheckoutUrl(intention.clientSecret) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    console.error("POST /api/payment/checkout failed:", error);
    return apiErrors.serverError();
  }
}
