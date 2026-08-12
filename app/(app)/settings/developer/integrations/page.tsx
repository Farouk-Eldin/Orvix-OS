"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, MessageSquare, FileText, Video, Hash } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ApiResponse } from "@/types/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

const CATALOG = [
  {
    slug: "google_calendar",
    provider: "GOOGLE_CALENDAR",
    name: "Google Calendar",
    description: "كل حجز بيتأكد بيتضاف تلقائيًا لتقويم Google بتاعك.",
    icon: Calendar,
    available: true,
  },
  { slug: "slack", provider: "SLACK", name: "Slack", description: "قريبًا — تنبيهات فورية على قناة Slack.", icon: Hash, available: false },
  {
    slug: "notion",
    provider: "NOTION",
    name: "Notion",
    description: "قريبًا — مزامنة قاعدة المعرفة مع صفحات Notion.",
    icon: FileText,
    available: false,
  },
  {
    slug: "zoom",
    provider: "ZOOM",
    name: "Zoom",
    description: "قريبًا — إنشاء رابط اجتماع تلقائي مع كل حجز.",
    icon: Video,
    available: false,
  },
  {
    slug: "telegram",
    provider: "TELEGRAM",
    name: "Telegram",
    description: "قريبًا — قناة تواصل إضافية للعملاء.",
    icon: MessageSquare,
    available: false,
  },
];

// useSearchParams() forces this part out of static rendering — Next.js
// requires it to sit behind its own Suspense boundary rather than at the
// top of the page component, or the whole page fails to prerender.
function ConnectionStatusHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) toast.success("تم الربط بنجاح");
    if (error) toast.error(error);
    if (connected || error) router.replace("/settings/developer/integrations");
  }, [searchParams, router]);

  return null;
}

export default function IntegrationsPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["oauth-connections"],
    queryFn: () => fetchJson<{ connections: { provider: string }[] }>("/api/v1/oauth"),
  });

  const disconnect = useMutation({
    mutationFn: (slug: string) => fetchJson(`/api/v1/oauth/${slug}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم فصل الربط");
      queryClient.invalidateQueries({ queryKey: ["oauth-connections"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const connectedProviders = new Set(data?.connections.map((c) => c.provider) ?? []);

  return (
    <div className="max-w-2xl space-y-4">
      <Suspense fallback={null}>
        <ConnectionStatusHandler />
      </Suspense>

      <div>
        <h1 className="text-xl font-bold">مركز التكاملات</h1>
        <p className="text-sm text-muted-foreground">اربط أدوات تانية بحسابك — كل تكامل شغال فعليًا، مفيش حاجة وهمية.</p>
      </div>

      <div className="space-y-3">
        {CATALOG.map((item) => {
          const isConnected = connectedProviders.has(item.provider);
          return (
            <Card key={item.slug}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="size-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 font-medium">
                      {item.name}
                      {isConnected && <Badge variant="success">متصل</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </div>

                {item.available ? (
                  isConnected ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={disconnect.isPending}
                      onClick={() => disconnect.mutate(item.slug)}
                    >
                      فصل الربط
                    </Button>
                  ) : (
                    <Button size="sm" asChild>
                      <a href={`/api/v1/oauth/${item.slug}/connect`}>ربط</a>
                    </Button>
                  )
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    قريبًا
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
