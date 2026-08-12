import { siteConfig } from "@/config/site";

const PAYMOB_BASE_URL = "https://accept.paymob.com";

export interface CreateIntentionParams {
  amountCents: number;
  currency: "EGP";
  specialReference: string;
  billingData: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  notificationUrl: string;
  redirectionUrl: string;
}

interface PaymobIntentionResponse {
  id: string;
  client_secret: string;
  status: string;
}

/**
 * The Intention API is Paymob's current (v1) entry point — one call
 * covers card, Meeza, and every supported wallet, since the payment
 * method picker lives on Paymob's own Unified Checkout page.
 */
export async function createPaymentIntention(
  params: CreateIntentionParams
): Promise<{ success: true; clientSecret: string; intentionId: string } | { success: false; error: string }> {
  const secretKey = process.env.PAYMOB_API_KEY;
  const cardIntegration = process.env.PAYMOB_INTEGRATION_ID_CARD;
  const walletIntegration = process.env.PAYMOB_INTEGRATION_ID_WALLET;

  if (!secretKey || !cardIntegration) {
    return { success: false, error: "Paymob غير مُعد بعد — راجع متغيرات البيئة PAYMOB_*" };
  }

  const paymentMethods = [Number(cardIntegration), ...(walletIntegration ? [Number(walletIntegration)] : [])];

  try {
    const res = await fetch(`${PAYMOB_BASE_URL}/v1/intention/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: params.amountCents,
        currency: params.currency,
        payment_methods: paymentMethods,
        items: [
          {
            name: `${siteConfig.name} — اشتراك شهري`,
            amount: params.amountCents,
            quantity: 1,
          },
        ],
        billing_data: {
          first_name: params.billingData.firstName,
          last_name: params.billingData.lastName,
          email: params.billingData.email,
          phone_number: params.billingData.phoneNumber,
        },
        special_reference: params.specialReference,
        notification_url: params.notificationUrl,
        redirection_url: params.redirectionUrl,
      }),
    });

    const json = (await res.json()) as PaymobIntentionResponse & { detail?: string };
    if (!res.ok) {
      return { success: false, error: json.detail ?? `HTTP ${res.status}` };
    }

    return { success: true, clientSecret: json.client_secret, intentionId: json.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "فشل الاتصال بـ Paymob" };
  }
}

export function buildUnifiedCheckoutUrl(clientSecret: string): string {
  const publicKey = process.env.PAYMOB_PUBLIC_KEY ?? "";
  const url = new URL(`${PAYMOB_BASE_URL}/unifiedcheckout/`);
  url.searchParams.set("publicKey", publicKey);
  url.searchParams.set("clientSecret", clientSecret);
  return url.toString();
}
