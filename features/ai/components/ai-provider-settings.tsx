"use client";

import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAiProviders, useSaveAiProvider } from "@/features/ai/hooks/use-ai-providers";

const PROVIDER_META = {
  GEMINI: { label: "Gemini (Google)", defaultModel: "gemini-flash-latest", getKeyUrl: "https://aistudio.google.com/apikey" },
  GROK: { label: "Grok (xAI)", defaultModel: "grok-4.5", getKeyUrl: "https://console.x.ai" },
} as const;

function ProviderCard({ provider }: { provider: "GEMINI" | "GROK" }) {
  const meta = PROVIDER_META[provider];
  const { data: providers } = useAiProviders();
  const saved = providers?.find((p) => p.provider === provider);
  const saveProvider = useSaveAiProvider();
  const [apiKey, setApiKey] = useState("");

  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">{meta.label}</CardTitle>
          <CardDescription>
            {saved ? `متصل — ${saved.maskedKey}` : "مش متصل لسه"}
          </CardDescription>
        </div>
        {saved && (
          <Badge variant="success">
            <ShieldCheck className="size-3.5" /> مشفّر
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${provider}-key`}>مفتاح API</Label>
          <Input
            id={`${provider}-key`}
            type="password"
            placeholder={saved ? "اكتب مفتاح جديد لو عايز تستبدله" : "الصق مفتاح الـ API هنا"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            هتحصل على المفتاح من{" "}
            <a href={meta.getKeyUrl} target="_blank" rel="noreferrer" className="text-primary underline">
              {meta.getKeyUrl}
            </a>
          </p>
        </div>
        <Button
          size="sm"
          disabled={!apiKey.trim() || saveProvider.isPending}
          onClick={() =>
            saveProvider.mutate(
              { provider, apiKey: apiKey.trim(), defaultModel: meta.defaultModel },
              { onSuccess: () => setApiKey("") }
            )
          }
        >
          {saveProvider.isPending && <Loader2 className="size-4 animate-spin" />}
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
}

export function AiProviderSettings() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          المفاتيح بتتشفّر (AES-256) قبل ما تتخزّن، ومبتترجعش كاملة لأي طلب — حتى لك. الذكاء الاصطناعي محتاج
          مزود واحد على الأقل عشان يرد على عملائك.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ProviderCard provider="GEMINI" />
        <ProviderCard provider="GROK" />
      </div>
    </div>
  );
}
