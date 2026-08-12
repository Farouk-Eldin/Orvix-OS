"use client";

// PROPOSAL — target path: app/(app)/settings/developer/page.tsx (new file)

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Play, Plug, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiResponse } from "@/types/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  revokedAt: string | null;
}
interface WebhookRow {
  id: string;
  name: string;
  endpointUrl: string;
  events: string[];
  active: boolean;
}

function OneTimeSecret({ label, value, onDone }: { label: string; value: string; onDone: () => void }) {
  return (
    <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
      <div className="text-xs font-medium">{label} — احفظه دلوقتي، مش هيتعرض تاني</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-background p-2 text-xs">{value}</code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("اتنسخ");
          }}
          className="rounded-lg border p-2 hover:bg-muted"
        >
          <Copy className="size-4" />
        </button>
      </div>
      <Button size="sm" variant="secondary" onClick={onDone}>
        تمام، حفظته
      </Button>
    </div>
  );
}

export default function DeveloperSettingsPage() {
  const queryClient = useQueryClient();
  const { data: keys } = useQuery({ queryKey: ["api-keys"], queryFn: () => fetchJson<ApiKeyRow[]>("/api/v1/developer/api-keys") });
  const { data: webhooks } = useQuery({ queryKey: ["webhooks"], queryFn: () => fetchJson<WebhookRow[]>("/api/v1/developer/webhooks") });

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [webhookForm, setWebhookForm] = useState({ name: "", endpointUrl: "" });

  const createKey = useMutation({
    mutationFn: () =>
      fetchJson<{ fullKey: string }>("/api/v1/developer/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName, permissions: ["customers:read"] }),
      }),
    onSuccess: (data) => {
      setRevealedKey(data.fullKey);
      setKeyName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const revokeKey = useMutation({
    mutationFn: (keyId: string) => fetchJson(`/api/v1/developer/api-keys/${keyId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم الإلغاء");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  const createWebhook = useMutation({
    mutationFn: () =>
      fetchJson<{ secret: string }>("/api/v1/developer/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...webhookForm, events: ["BOOKING_CREATED", "BOOKING_STATUS_CHANGED"] }),
      }),
    onSuccess: (data) => {
      setRevealedSecret(data.secret);
      setWebhookForm({ name: "", endpointUrl: "" });
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">إعدادات المطورين</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/developer/integrations">
              <Plug className="size-3.5" />
              التكاملات
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/developer/playground">
              <Play className="size-3.5" />
              API Playground
            </Link>
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">API Keys</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                مفتاح جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>مفتاح API جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input placeholder="اسم المفتاح" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
                <Button className="w-full" disabled={!keyName} onClick={() => createKey.mutate()}>
                  إنشاء
                </Button>
                {revealedKey && <OneTimeSecret label="المفتاح" value={revealedKey} onDone={() => setRevealedKey(null)} />}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-2">
          {(keys ?? []).map((k) => (
            <Card key={k.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <div className="text-sm font-medium">{k.name}</div>
                  <code className="text-xs text-muted-foreground">{k.keyPrefix}...</code>
                </div>
                <div className="flex items-center gap-2">
                  {k.revokedAt ? (
                    <Badge variant="destructive">ملغي</Badge>
                  ) : (
                    <button onClick={() => revokeKey.mutate(k.id)} className="rounded-lg border p-1.5 hover:bg-destructive/10">
                      <Trash2 className="size-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Webhooks</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Webhook جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Webhook جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>الاسم</Label>
                  <Input value={webhookForm.name} onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>الرابط</Label>
                  <Input
                    placeholder="https://yourapp.com/webhooks/orvix"
                    value={webhookForm.endpointUrl}
                    onChange={(e) => setWebhookForm({ ...webhookForm, endpointUrl: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!webhookForm.name || !webhookForm.endpointUrl}
                  onClick={() => createWebhook.mutate()}
                >
                  إنشاء
                </Button>
                {revealedSecret && (
                  <OneTimeSecret label="الـ Secret" value={revealedSecret} onDone={() => setRevealedSecret(null)} />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-2">
          {(webhooks ?? []).map((w) => (
            <Card key={w.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{w.name}</div>
                  <Badge variant={w.active ? "default" : "secondary"}>{w.active ? "شغال" : "متوقف"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{w.endpointUrl}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {w.events.map((e) => (
                    <Badge key={e} variant="outline" className="text-[10px]">
                      {e}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
