"use client";

// PROPOSAL — target path: app/(app)/settings/branding/page.tsx (new file)

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Clock, Copy, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiResponse } from "@/types/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

interface Branding {
  logo: string | null;
  favicon: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  customCss: string | null;
}
interface DomainRecord {
  domain: string;
  status: "PENDING_DNS" | "VERIFIED" | "FAILED";
  verificationToken: string;
}

export default function BrandingSettingsPage() {
  const queryClient = useQueryClient();
  const { data: branding } = useQuery({
    queryKey: ["branding"],
    queryFn: () => fetchJson<Branding>("/api/v1/branding"),
  });
  const { data: domain } = useQuery({
    queryKey: ["branding-domain"],
    queryFn: () => fetchJson<DomainRecord | null>("/api/v1/branding/domain"),
  });

  const [form, setForm] = useState({ primaryColor: "#4F46E5", secondaryColor: "#818CF8", logo: "" });
  const [domainInput, setDomainInput] = useState("");

  const saveBranding = useMutation({
    mutationFn: () =>
      fetchJson("/api/v1/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast.success("اتحفظت الهوية البصرية");
      queryClient.invalidateQueries({ queryKey: ["branding"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requestDomain = useMutation({
    mutationFn: () =>
      fetchJson("/api/v1/branding/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput }),
      }),
    onSuccess: () => {
      toast.success("اتسجل الطلب — ضيف الـ TXT record وبعدين اضغط تحقق");
      queryClient.invalidateQueries({ queryKey: ["branding-domain"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyDomain = useMutation({
    mutationFn: () => fetchJson<DomainRecord>("/api/v1/branding/domain/verify", { method: "POST" }),
    onSuccess: (data) => {
      if (data.status === "VERIFIED") toast.success("الدومين اتأكد!");
      else toast.info("لسه معملناش لقاه، جرب تاني بعد دقايق");
      queryClient.invalidateQueries({ queryKey: ["branding-domain"] });
    },
  });

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="mb-3 font-semibold">الهوية البصرية</h2>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>رابط اللوجو</Label>
            <Input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>اللون الأساسي</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="h-9 w-9 rounded-lg border"
                />
                <Input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>اللون الثانوي</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.secondaryColor}
                  onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })}
                  className="h-9 w-9 rounded-lg border"
                />
                <Input value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} />
              </div>
            </div>
          </div>
          <Button disabled={saveBranding.isPending} onClick={() => saveBranding.mutate()}>
            {saveBranding.isPending ? "جاري الحفظ..." : "حفظ الهوية البصرية"}
          </Button>
          {branding?.logo && <p className="text-xs text-muted-foreground">اللوجو الحالي: {branding.logo}</p>}
        </div>
      </div>

      <div className="border-t pt-6">
        <h2 className="mb-1 font-semibold">دومين مخصص</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          مثال: chat.company.com — محتاج وصول لإعدادات الـ DNS بتاعت الدومين
        </p>

        {!domain ? (
          <div className="flex gap-2">
            <Input placeholder="chat.company.com" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} />
            <Button disabled={!domainInput || requestDomain.isPending} onClick={() => requestDomain.mutate()}>
              طلب
            </Button>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{domain.domain}</span>
              <Badge variant={domain.status === "VERIFIED" ? "default" : "secondary"}>
                {domain.status === "VERIFIED" ? (
                  <>
                    <Check className="me-1 size-3" /> متأكد
                  </>
                ) : (
                  <>
                    <Clock className="me-1 size-3" /> بانتظار DNS
                  </>
                )}
              </Badge>
            </div>

            {domain.status !== "VERIFIED" && (
              <div className="space-y-2 rounded-lg bg-muted p-3 text-xs">
                <p>ضيف TXT record في إعدادات الـ DNS بتاع الدومين:</p>
                <div className="flex items-center justify-between gap-2 rounded-md bg-background p-2">
                  <code className="truncate">_orvix-verify.{domain.domain}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`_orvix-verify.${domain.domain}`);
                      toast.success("اتنسخ");
                    }}
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-md bg-background p-2">
                  <code className="truncate">{domain.verificationToken}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(domain.verificationToken);
                      toast.success("اتنسخ");
                    }}
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
                <Button size="sm" variant="secondary" disabled={verifyDomain.isPending} onClick={() => verifyDomain.mutate()}>
                  <RefreshCw className={`me-1.5 size-3.5 ${verifyDomain.isPending ? "animate-spin" : ""}`} />
                  تحقق دلوقتي
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
