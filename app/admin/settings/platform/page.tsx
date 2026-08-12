"use client";

// PROPOSAL — target path: app/admin/settings/platform/page.tsx (new file)
// Dark theme matching real admin pages.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiResponse } from "@/types/api";

interface Settings {
  marketplace: { autoApprovalEnabled: boolean; sensitivePermissions: string[] };
  payments: { defaultProvider: string; enabledProviders: string[] };
  maintenance: { enabled: boolean; message: string; estimatedTime: string };
  registeredProviders: string[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function PlatformSettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => fetchJson<Settings>("/api/admin/platform-settings"),
  });

  const [newPermission, setNewPermission] = useState("");

  const save = useMutation({
    mutationFn: (patch: Partial<Pick<Settings, "marketplace" | "payments" | "maintenance">>) =>
      fetchJson("/api/admin/platform-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      toast.success("اتحفظت الإعدادات");
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data) return <p className="text-sm text-white/50">بيتحمّل...</p>;

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-lg font-bold">إعدادات المنصة</h1>

      <section
        className={`space-y-3 rounded-2xl border p-4 ${
          data.maintenance.enabled ? "border-red-500/30 bg-red-500/10" : "border-white/10 bg-white/5"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">وضع الصيانة</h2>
          <label className="flex items-center gap-2 text-sm">
            <span className={data.maintenance.enabled ? "text-red-400" : "text-white/50"}>
              {data.maintenance.enabled ? "مفعّل — المنصة مقفولة على العملاء دلوقتي" : "متوقف"}
            </span>
            <input
              type="checkbox"
              checked={data.maintenance.enabled}
              onChange={(e) => save.mutate({ maintenance: { ...data.maintenance, enabled: e.target.checked } })}
            />
          </label>
        </div>
        <p className="text-xs text-white/40">
          لما يتفعّل، أي زائر لأي صفحة غير لوحة الأدمن هيشوف صفحة صيانة بدل الموقع. الـ webhooks (واتساب/فيسبوك/Paymob)
          وصفحة الأدمن بيفضلوا شغالين عادي عشان محدش يتقفل برّه بالغلط.
        </p>

        <div className="space-y-1.5">
          <div className="text-sm">الرسالة اللي هتظهر للعملاء</div>
          <textarea
            value={data.maintenance.message}
            onChange={(e) => save.mutate({ maintenance: { ...data.maintenance, message: e.target.value } })}
            className="min-h-20 w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <div className="text-sm">الوقت المتوقع (اختياري)</div>
          <input
            value={data.maintenance.estimatedTime}
            onChange={(e) => save.mutate({ maintenance: { ...data.maintenance, estimatedTime: e.target.value } })}
            placeholder="مثلاً: نص ساعة"
            className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">سياسة مراجعة التطبيقات</h2>

        <label className="flex items-center justify-between text-sm">
          <span>الموافقة التلقائية على التحديثات البسيطة</span>
          <input
            type="checkbox"
            checked={data.marketplace.autoApprovalEnabled}
            onChange={(e) => save.mutate({ marketplace: { ...data.marketplace, autoApprovalEnabled: e.target.checked } })}
          />
        </label>
        <p className="text-xs text-white/40">
          حتى لو مفعّلة، أول نسخة لأي تطبيق ولو طلبت صلاحية حساسة أو صلاحية جديدة بتدخل مراجعة يدوية دايمًا.
        </p>

        <div>
          <div className="mb-1.5 text-sm">الصلاحيات الحساسة (بتفرض مراجعة يدوية دايمًا)</div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {data.marketplace.sensitivePermissions.map((p) => (
              <span
                key={p}
                className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-1 text-xs text-destructive"
              >
                {p}
                <button
                  onClick={() =>
                    save.mutate({
                      marketplace: {
                        ...data.marketplace,
                        sensitivePermissions: data.marketplace.sensitivePermissions.filter((x) => x !== p),
                      },
                    })
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newPermission}
              onChange={(e) => setNewPermission(e.target.value)}
              placeholder="مثلاً: analytics:export"
              className="flex-1 rounded-lg border border-white/10 bg-black/20 p-2 text-xs outline-none"
            />
            <button
              onClick={() => {
                if (!newPermission) return;
                save.mutate({
                  marketplace: {
                    ...data.marketplace,
                    sensitivePermissions: [...data.marketplace.sensitivePermissions, newPermission],
                  },
                });
                setNewPermission("");
              }}
              className="rounded-lg bg-white px-3 text-xs font-medium text-black"
            >
              إضافة
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">مزوّد الدفع</h2>
        <p className="text-xs text-white/40">
          المتاحين في الكود حاليًا: {data.registeredProviders.join(", ")}. إضافة مزوّد جديد (Stripe مثلاً) محتاجة كود
          الأول، وبعدين يظهر هنا.
        </p>

        <div className="space-y-1.5">
          <div className="text-sm">الافتراضي</div>
          <select
            value={data.payments.defaultProvider}
            onChange={(e) => save.mutate({ payments: { ...data.payments, defaultProvider: e.target.value } })}
            className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm"
          >
            {data.registeredProviders.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
}
