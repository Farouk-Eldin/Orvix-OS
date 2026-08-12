// PROPOSAL — target path: lib/payments/providers/paymob.provider.ts (new file)
//
// A wrapper, not a rewrite. Every actual call goes straight to the real
// existing lib/payments/paymob-client.ts and paymob-hmac.ts — this file
// adds zero new Paymob-specific logic, it only adapts the existing
// functions' shape to the PaymentProvider interface so Marketplace code
// (and anything else written against the interface) can use Paymob
// without knowing it's Paymob.
//
// Deliberately NOT wired into the existing subscription checkout route
// (app/api/v1/payment/checkout/route.ts) or webhook
// (app/api/webhooks/paymob/route.ts) — those work today, are
// subscription-specific, and migrating them onto this abstraction is a
// separate decision with its own risk, not something this milestone
// (Marketplace infrastructure) asked for or needs. This provider exists
// so NEW payment flows (Marketplace charging, once monetization is
// built) and future providers (Stripe, PayPal) have somewhere real to
// plug in — see payment-provider-registry.ts.

import { createPaymentIntention, buildUnifiedCheckoutUrl } from "@/lib/payments/paymob-client";
import { verifyPaymobHmac } from "@/lib/payments/paymob-hmac";
import type { CreatePaymentParams, CreatePaymentResult, PaymentProvider } from "@/lib/payments/types";

export class PaymobPaymentProvider implements PaymentProvider {
  readonly name = "PAYMOB";

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const intention = await createPaymentIntention({
      amountCents: params.amountCents,
      currency: params.currency as "EGP", // Paymob's real client is EGP-only today — surfaced here, not hidden
      specialReference: params.reference,
      billingData: params.billingData,
      notificationUrl: params.notificationUrl,
      redirectionUrl: params.redirectionUrl,
    });

    if (!intention.success) {
      return { success: false, error: intention.error };
    }

    return {
      success: true,
      checkoutUrl: buildUnifiedCheckoutUrl(intention.clientSecret),
      providerRef: intention.intentionId,
    };
  }

  // rawPayload here is the PARSED transaction object (payload.obj from
  // Paymob's webhook body) — not a string — because that's genuinely
  // what verifyPaymobHmac needs. See the note in types.ts.
  verifyWebhookSignature(rawPayload: unknown, signatureHeader: string | null): boolean {
    return verifyPaymobHmac(rawPayload, signatureHeader);
  }
}
