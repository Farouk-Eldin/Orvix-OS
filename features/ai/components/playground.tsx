"use client";

import { useState } from "react";
import { Send, Sparkles, Loader2, Clock, Coins, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAiTest, type AiTestResult } from "@/features/ai/hooks/use-ai-test";

interface Turn {
  sender: "CUSTOMER" | "AI";
  content: string;
}

const confidenceBadge: Record<AiTestResult["confidence"], { label: string; variant: "success" | "warning" | "destructive" }> = {
  HIGH: { label: "ثقة عالية", variant: "success" },
  MEDIUM: { label: "ثقة متوسطة", variant: "warning" },
  LOW: { label: "معلومة غير متاحة", variant: "destructive" },
};

export function Playground() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [lastResult, setLastResult] = useState<AiTestResult | null>(null);
  const aiTest = useAiTest();

  const send = () => {
    const message = input.trim();
    if (!message || aiTest.isPending) return;

    const history = turns;
    setTurns((t) => [...t, { sender: "CUSTOMER", content: message }]);
    setInput("");

    aiTest.mutate(
      { message, history },
      {
        onSuccess: (result) => {
          setTurns((t) => [...t, { sender: "AI", content: result.reply }]);
          setLastResult(result);
        },
        onError: (error) => {
          setTurns((t) => [...t, { sender: "AI", content: `⚠ ${error.message}` }]);
        },
      }
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="flex h-[560px] flex-col rounded-3xl">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" /> جرّب المساعد الذكي
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden pt-4">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {turns.length === 0 && (
              <p className="pt-10 text-center text-sm text-muted-foreground">
                اكتب سؤال زي ما هيسأله عميلك، وشوف المساعد هيرد إزاي بناءً على قاعدة معرفتك.
              </p>
            )}
            {turns.map((turn, i) => (
              <div
                key={i}
                className={turn.sender === "CUSTOMER" ? "ms-auto max-w-[75%]" : "me-auto max-w-[80%]"}
              >
                <div
                  className={
                    turn.sender === "CUSTOMER"
                      ? "glass-panel rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm"
                      : "rounded-2xl rounded-tr-sm border border-border bg-card/70 px-4 py-2.5 text-sm backdrop-blur-xl"
                  }
                >
                  {turn.content}
                </div>
              </div>
            ))}
            {aiTest.isPending && (
              <div className="me-auto flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> بيفكر...
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="اكتب سؤال العميل هنا..."
              disabled={aiTest.isPending}
            />
            <Button size="icon" onClick={send} disabled={aiTest.isPending || !input.trim()}>
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit rounded-3xl">
        <CardHeader>
          <CardTitle className="text-sm">تفاصيل آخر رد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {!lastResult ? (
            <p className="text-xs text-muted-foreground">هتظهر هنا بعد أول رسالة</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الثقة</span>
                <Badge variant={confidenceBadge[lastResult.confidence].variant}>
                  {confidenceBadge[lastResult.confidence].label}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5" /> وقت الرد
                </span>
                <span className="font-medium">{lastResult.timing.totalMs} مللي ثانية</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Database className="size-3.5" /> وقت البحث
                </span>
                <span className="font-medium">{lastResult.timing.promptMs} مللي ثانية</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Coins className="size-3.5" /> التوكنز
                </span>
                <span className="font-medium">
                  {lastResult.tokens.input} → {lastResult.tokens.output}
                </span>
              </div>

              {lastResult.usedProvider && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المزود</span>
                  <span className="font-medium">{lastResult.usedProvider}</span>
                </div>
              )}

              <div>
                <div className="mb-2 text-muted-foreground">الأجزاء المسترجَعة</div>
                {lastResult.retrievedChunks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">مفيش أجزاء ذات صلة</p>
                ) : (
                  <div className="space-y-2">
                    {lastResult.retrievedChunks.map((chunk, i) => (
                      <div key={i} className="rounded-xl border border-border bg-muted/30 p-2.5 text-xs">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium">{chunk.fileName}</span>
                          <span className="text-muted-foreground">{chunk.score}</span>
                        </div>
                        <p className="text-muted-foreground">{chunk.preview}…</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
