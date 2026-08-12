"use client";

import { useState } from "react";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function ApiPlaygroundPage() {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/api/public/v1/customers?search=");
  const [apiKey, setApiKey] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);

  async function send() {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch(path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        ...(method !== "GET" && body ? { body } : {}),
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // not JSON — show as-is
      }
      setResponse({ status: res.status, body: pretty });
    } catch (error) {
      setResponse({ status: 0, body: error instanceof Error ? error.message : "فشل الاتصال" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">API Playground</h1>
        <p className="text-sm text-muted-foreground">
          جرّب الـ Public API الحقيقي بمفتاحك — الطلب بيتبعت فعليًا، مش محاكاة.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex gap-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["GET", "POST", "PATCH", "DELETE"].map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/api/public/v1/customers" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="playground-key">API Key</Label>
            <Input
              id="playground-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="orv_live_..."
            />
            <p className="text-xs text-muted-foreground">
              محتاج تحط مفتاح جديد من صفحة الإعدادات → المطورين (المفتاح بيتعرض مرة واحدة بس وقت الإنشاء).
            </p>
          </div>

          {method !== "GET" && (
            <div className="space-y-1.5">
              <Label htmlFor="playground-body">Body (JSON)</Label>
              <Textarea
                id="playground-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{ "name": "..." }'
                className="min-h-24 font-mono text-xs"
              />
            </div>
          )}

          <Button className="w-full" disabled={loading} onClick={send}>
            <Play className="size-4" />
            {loading ? "جاري الإرسال..." : "إرسال الطلب"}
          </Button>
        </CardContent>
      </Card>

      {response && (
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">الاستجابة:</span>
              <span
                className={
                  response.status >= 200 && response.status < 300
                    ? "text-emerald-600"
                    : response.status === 0
                      ? "text-muted-foreground"
                      : "text-destructive"
                }
              >
                {response.status || "—"}
              </span>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs" dir="ltr">
              {response.body}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
