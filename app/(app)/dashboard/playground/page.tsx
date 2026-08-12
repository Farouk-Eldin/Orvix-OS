import { FlaskConical } from "lucide-react";

import { Playground } from "@/features/ai/components/playground";

export default function PlaygroundPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FlaskConical className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">اختبار الذكاء الاصطناعي</h1>
          <p className="text-sm text-muted-foreground">
            جرّب المساعد قبل ما توصّل واتساب — الرسايل هنا مبتحسبش من رصيدك المجاني
          </p>
        </div>
      </div>

      <Playground />
    </div>
  );
}
