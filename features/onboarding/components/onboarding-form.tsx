"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ApiResponse } from "@/types/api";
import {
  onboardingSchema,
  businessTypeOptions,
  countryOptions,
  timezoneOptions,
  type OnboardingValues,
} from "@/features/onboarding/schemas/onboarding.schema";

export function OnboardingForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      businessName: "",
      businessType: "",
      country: "EG",
      logoUrl: "",
      supportLanguage: "AUTO",
      timezone: "Africa/Cairo",
    },
  });

  const onSubmit = (values: OnboardingValues) => {
    startTransition(async () => {
      const res = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result: ApiResponse<{ workspaceId: string; slug: string }> = await res.json();

      if (!result.success) {
        toast.error(result.message);
        if (result.errors && !Array.isArray(result.errors)) {
          for (const [field, messages] of Object.entries(result.errors)) {
            const firstMessage = messages?.[0];
            if (firstMessage) {
              setError(field as keyof OnboardingValues, { message: firstMessage });
            }
          }
        }
        return;
      }

      router.push("/dashboard");
    });
  };

  return (
    <Card className="w-full max-w-lg rounded-3xl shadow-xl">
      <CardHeader className="gap-2 text-center">
        <CardTitle className="text-2xl font-bold">خلّينا نجهّز نشاطك</CardTitle>
        <CardDescription>هنستخدم البيانات دي عشان نظبطلك المساعد الذكي على مقاسك</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="businessName">اسم النشاط</Label>
            <Input id="businessName" placeholder="مثال: متجر الأناقة" {...register("businessName")} aria-invalid={!!errors.businessName} />
            {errors.businessName && <p className="text-xs text-destructive">{errors.businessName.message}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessType">نوع النشاط</Label>
              <Select value={watch("businessType")} onValueChange={(v) => setValue("businessType", v, { shouldValidate: true })}>
                <SelectTrigger id="businessType" aria-invalid={!!errors.businessType}>
                  <SelectValue placeholder="اختار النوع" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.businessType && <p className="text-xs text-destructive">{errors.businessType.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">الدولة</Label>
              <Select value={watch("country")} onValueChange={(v) => setValue("country", v, { shouldValidate: true })}>
                <SelectTrigger id="country" aria-invalid={!!errors.country}>
                  <SelectValue placeholder="اختار الدولة" />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="supportLanguage">لغة الدعم</Label>
              <Select
                value={watch("supportLanguage")}
                onValueChange={(v) => setValue("supportLanguage", v as OnboardingValues["supportLanguage"], { shouldValidate: true })}
              >
                <SelectTrigger id="supportLanguage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">تلقائي (يتبع لغة العميل)</SelectItem>
                  <SelectItem value="AR">عربي دايمًا</SelectItem>
                  <SelectItem value="EN">إنجليزي دايمًا</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">المنطقة الزمنية</Label>
              <Select value={watch("timezone")} onValueChange={(v) => setValue("timezone", v, { shouldValidate: true })}>
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">
              رابط الشعار <span className="font-normal text-muted-foreground">(اختياري — رفع الملفات مباشر متاح في مرحلة قاعدة المعرفة)</span>
            </Label>
            <Input id="logoUrl" placeholder="https://..." {...register("logoUrl")} aria-invalid={!!errors.logoUrl} />
            {errors.logoUrl && <p className="text-xs text-destructive">{errors.logoUrl.message}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "جاري الإعداد..." : "ابدأ الآن"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
