// PROPOSAL — target path: app/api/admin/platform-settings/route.ts (new file)
// The one route the Super Admin dashboard calls to read/edit everything
// this session's Marketplace decisions said must be admin-configurable:
// auto-approval toggle, sensitive permissions list, default/enabled
// payment providers.

import { z } from "zod";

import { requireSuperAdmin, NotSuperAdminError } from "@/features/authentication/services/get-current-workspace";
import { platformSettingsService } from "@/features/admin/services/platform-settings.service";
import { listRegisteredProviders } from "@/lib/payments/payment-provider-registry";
import { apiError, apiErrors, apiSuccess } from "@/lib/api-response";

const PROVIDER_VALUES = ["PAYMOB", "STRIPE", "PAYPAL"] as const;

const updateSchema = z.object({
  marketplace: z
    .object({
      autoApprovalEnabled: z.boolean(),
      sensitivePermissions: z.array(z.string()),
    })
    .optional(),
  payments: z
    .object({
      defaultProvider: z.enum(PROVIDER_VALUES),
      enabledProviders: z.array(z.enum(PROVIDER_VALUES)).min(1),
    })
    .optional(),
  maintenance: z
    .object({
      enabled: z.boolean(),
      message: z.string().min(1, "لازم تكتب رسالة تتعرض للعملاء"),
      estimatedTime: z.string(),
    })
    .optional(),
});

export async function GET() {
  try {
    await requireSuperAdmin();
    const [marketplace, payments, maintenance] = await Promise.all([
      platformSettingsService.getMarketplaceSettings(),
      platformSettingsService.getPaymentSettings(),
      platformSettingsService.getMaintenanceMode(),
    ]);
    return apiSuccess({ marketplace, payments, maintenance, registeredProviders: listRegisteredProviders() });
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    return apiErrors.serverError();
  }
}

export async function PATCH(request: Request) {
  try {
    const { user: admin } = await requireSuperAdmin();

    const json = await request.json();
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) return apiError("بيانات غير صحيحة", parsed.error.flatten().formErrors, 400);

    // A provider can't be the default unless it's also in the enabled
    // list — checked here rather than trusting the client to keep the
    // two fields consistent.
    if (parsed.data.payments && !parsed.data.payments.enabledProviders.includes(parsed.data.payments.defaultProvider)) {
      return apiError("مزوّد الدفع الافتراضي لازم يكون من ضمن المزوّدين المفعّلين", [], 400);
    }

    const registered = listRegisteredProviders();
    if (parsed.data.payments) {
      const unregistered = parsed.data.payments.enabledProviders.filter((p) => !registered.includes(p));
      if (unregistered.length > 0) {
        return apiError(`مزوّدين مش متاحين في الكود لسه: ${unregistered.join(", ")}`, [], 400);
      }
    }

    if (parsed.data.marketplace) {
      await platformSettingsService.setMarketplaceSettings(parsed.data.marketplace, admin.id);
    }
    if (parsed.data.payments) {
      await platformSettingsService.setPaymentSettings(parsed.data.payments, admin.id);
    }
    if (parsed.data.maintenance) {
      await platformSettingsService.setMaintenanceMode(parsed.data.maintenance, admin.id);
    }

    return apiSuccess({ saved: true }, "اتحفظت الإعدادات");
  } catch (error) {
    if (error instanceof NotSuperAdminError) return apiErrors.unauthorized();
    console.error("PATCH /api/admin/platform-settings failed:", error);
    return apiErrors.serverError();
  }
}
