// PROPOSAL — target path: lib/payments/types.ts (new file)
//
// Note on verifyWebhookSignature's payload type: intentionally `unknown`,
// not `string`. Paymob's real HMAC (see paymob-hmac.ts) signs a specific
// ORDERED CONCATENATION of fields pulled from the parsed transaction
// object — not a raw request body string. A future Stripe provider would
// sign the raw body string instead. Forcing both into one shape here
// would misrepresent how one of them actually works; each provider's
// implementation owns interpreting whatever `rawPayload` actually is.

export interface CreatePaymentParams {
  amountCents: number;
  currency: string;
  reference: string;
  billingData: { firstName: string; lastName: string; email: string; phoneNumber: string };
  notificationUrl: string;
  redirectionUrl: string;
}

export interface CreatePaymentResult {
  success: boolean;
  checkoutUrl?: string;
  providerRef?: string;
  error?: string;
}

/**
 * Every payment provider (Paymob today; Stripe/PayPal whenever they're
 * added) implements this exact shape. Marketplace and subscription
 * billing logic talk to this interface only — adding a new provider
 * never touches that logic, same pattern as AIProvider in
 * lib/ai/providers/types.ts.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  verifyWebhookSignature(rawPayload: unknown, signatureHeader: string | null): boolean;
}
