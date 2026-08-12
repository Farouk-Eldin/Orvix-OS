import { Settings } from "lucide-react";

import { AiProviderSettings } from "@/features/ai/components/ai-provider-settings";

export default function AiSettingsPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Settings className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">مزوّد الذكاء الاصطناعي</h1>
          <p className="text-sm text-muted-foreground">وصّل مفتاح Gemini أو Grok عشان المساعد يبدأ يرد</p>
        </div>
      </div>

      <AiProviderSettings />
    </div>
  );
}
