"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MessageCircle, Facebook, Instagram, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConversations } from "@/features/conversations/hooks/use-conversations";

const channelIcon = { WHATSAPP: MessageCircle, FACEBOOK: Facebook, INSTAGRAM: Instagram };
const confidenceVariant = { HIGH: "success", MEDIUM: "warning", LOW: "destructive" } as const;

interface ConversationRow {
  id: string;
  channel: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM";
  status: string;
  lastMessageAt: string | null;
  customer: { name: string | null; phone: string | null };
  messages: { content: string; sender: string; confidenceScore: string | null }[];
  _count: { messages: number };
}

export default function ConversationsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useConversations(search) as {
    data: { conversations: ConversationRow[]; total: number } | undefined;
    isLoading: boolean;
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageCircle className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">المحادثات</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? "..."} محادثة عبر كل القنوات</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="دور باسم أو رقم العميل..."
          className="w-full rounded-xl border border-border bg-background/60 py-2 pe-9 ps-3 text-sm outline-none backdrop-blur-sm placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />)
        ) : !data?.conversations.length ? (
          <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
            لسه مفيش محادثات — لما توصّل قناة، هتظهر هنا تلقائيًا
          </div>
        ) : (
          data.conversations.map((conv) => {
            const Icon = channelIcon[conv.channel];
            const lastMessage = conv.messages[0];
            return (
              <Link key={conv.id} href={`/dashboard/conversations/${conv.id}`}>
                <Card className="flex items-center gap-4 rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{conv.customer.name || conv.customer.phone || "عميل"}</span>
                      {lastMessage?.sender === "AI" && lastMessage.confidenceScore && (
                        <Badge variant={confidenceVariant[lastMessage.confidenceScore as keyof typeof confidenceVariant]}>
                          <Sparkles className="size-3" /> {lastMessage.confidenceScore}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {lastMessage?.content ?? "بدون رسائل"}
                    </p>
                  </div>
                  <div className="shrink-0 text-end text-xs text-muted-foreground">
                    <div>{conv._count.messages} رسالة</div>
                    {conv.lastMessageAt && <div>{new Date(conv.lastMessageAt).toLocaleDateString("ar-EG")}</div>}
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
