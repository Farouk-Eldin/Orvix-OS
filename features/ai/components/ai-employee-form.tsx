"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { AiPersonality, AiLanguageMode, ReplyLength } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAiEmployee, useUpdateAiEmployee } from "@/features/ai/hooks/use-ai-employee";

interface EmployeeFormState {
  name: string;
  personality: AiPersonality;
  tone: string;
  language: AiLanguageMode;
  replyLength: ReplyLength;
  emojiUsage: boolean;
  welcomeMessage: string;
  businessDescription: string;
  systemInstructions: string;
}

const personalityOptions: { value: AiPersonality; label: string }[] = [
  { value: "PROFESSIONAL", label: "رسمي" },
  { value: "FRIENDLY", label: "ودود" },
  { value: "LUXURY", label: "راقي وفخم" },
  { value: "MEDICAL", label: "طبي" },
  { value: "SALES", label: "مبيعات" },
  { value: "SUPPORT", label: "دعم فني" },
  { value: "MINIMAL", label: "مختصر" },
];

export function AiEmployeeForm() {
  const { data: employee, isLoading } = useAiEmployee();
  const update = useUpdateAiEmployee();

  const [form, setForm] = useState<EmployeeFormState>({
    name: "",
    personality: "PROFESSIONAL",
    tone: "",
    language: "AUTO",
    replyLength: "DETAILED",
    emojiUsage: false,
    welcomeMessage: "",
    businessDescription: "",
    systemInstructions: "",
  });

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name,
        personality: employee.personality,
        tone: employee.tone,
        language: employee.language,
        replyLength: employee.replyLength,
        emojiUsage: employee.emojiUsage,
        welcomeMessage: employee.welcomeMessage,
        businessDescription: employee.businessDescription,
        systemInstructions: employee.systemInstructions,
      });
    }
  }, [employee]);

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-muted/50" />;
  }

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" /> إعدادات الموظف الذكي
        </CardTitle>
        <CardDescription>ده اللي بيتحكم في شخصية المساعد وردوده — كل حاجة قابلة للتعديل</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>اسم المساعد</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>الشخصية</Label>
            <Select value={form.personality} onValueChange={(v) => setForm({ ...form, personality: v as AiPersonality })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {personalityOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>النبرة (وصف حر)</Label>
          <Input
            value={form.tone}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
            placeholder="مثال: ودود ومحترف، بيستخدم لغة بسيطة"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>اللغة</Label>
            <Select value={form.language} onValueChange={(v) => setForm({ ...form, language: v as AiLanguageMode })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AUTO">تلقائي</SelectItem>
                <SelectItem value="AR">عربي دايمًا</SelectItem>
                <SelectItem value="EN">إنجليزي دايمًا</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>طول الرد</Label>
            <Select value={form.replyLength} onValueChange={(v) => setForm({ ...form, replyLength: v as ReplyLength })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SHORT">مختصر</SelectItem>
                <SelectItem value="DETAILED">مفصّل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>الإيموجي</Label>
            <Select value={form.emojiUsage ? "yes" : "no"} onValueChange={(v) => setForm({ ...form, emojiUsage: v === "yes" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no">من غير إيموجي</SelectItem>
                <SelectItem value="yes">إيموجي باعتدال</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>رسالة الترحيب</Label>
          <Textarea value={form.welcomeMessage} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label>وصف النشاط (إيه اللي بتعمله الشركة؟)</Label>
          <Textarea value={form.businessDescription} onChange={(e) => setForm({ ...form, businessDescription: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label>تعليمات إضافية (إيه اللي المفروض يعمله ومايعملوش؟)</Label>
          <Textarea
            rows={5}
            value={form.systemInstructions}
            onChange={(e) => setForm({ ...form, systemInstructions: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            التعليمات دي بتتضاف فوق قاعدة المعرفة — مش بديل عنها. المساعد برضه هيرد بس من المعلومات الموجودة.
          </p>
        </div>

        <Button onClick={() => update.mutate(form)} disabled={update.isPending}>
          {update.isPending && <Loader2 className="size-4 animate-spin" />}
          حفظ الإعدادات
        </Button>
      </CardContent>
    </Card>
  );
}
