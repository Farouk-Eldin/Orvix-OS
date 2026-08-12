// PROPOSAL — target path: lib/payments/payment-provider-registry.ts (new file)
//
// The one place that knows Paymob exists at all. Everything else in the
// app should import getActivePaymentProvider() and code against the
// PaymentProvider interface — never `import { PaymobPaymentProvider }`
// directly outside this file. Adding Stripe later is: write
// stripe.provider.ts, add one line to the `providers` map below. No
// other file changes.

import { platformSettingsService } from "@/features/admin/services/platform-settings.service";
import { PaymobPaymentProvider } from "@/lib/payments/providers/paymob.provider";
import type { PaymentProvider } from "@/lib/payments/types";

const providers: Record<string, PaymentProvider> = {
  PAYMOB: new PaymobPaymentProvider(),
  // STRIPE: new StripePaymentProvider(),   <- future
  // PAYPAL: new PayPalPaymentProvider(),   <- future
};

export async function getActivePaymentProvider(): Promise<PaymentProvider> {
  const settings = await platformSettingsService.getPaymentSettings();
  const provider = providers[settings.defaultProvider];
  if (!provider) {
    throw new Error(`مزوّد الدفع "${settings.defaultProvider}" غير متاح — راجع إعدادات المنصة`);
  }
  return provider;
}

export function listRegisteredProviders(): string[] {
  return Object.keys(providers);
}
