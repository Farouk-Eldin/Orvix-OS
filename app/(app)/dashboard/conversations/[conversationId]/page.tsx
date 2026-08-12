"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useConversationDetail } from "@/features/conversations/hooks/use-conversations";

interface MessageRow {
  id: string;
  sender: "CUSTOMER" | "AI";
  content: string;
  confidenceScore: string | null;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  channel: string;
  status: string;
  customer: { name: string | null; phone: string | null; email: string | null; notes: string | null };
  messages: MessageRow[];
}

const confidenceVariant = { HIGH: "success", MEDIUM: "warning", LOW: "destructive" } as const;

export default function ConversationDetailPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  const { data, isLoading } = useConversationDetail(conversationId) as {
    data: ConversationDetail | undefined;
    isLoading: boolean;
  };

  if (isLoading || !data) {
    return <div className="p-6"><div className="h-96 animate-pulse rounded-3xl bg-muted/50" /></div>;
  }

  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1fr_280px]">
      <Card className="flex h-[70vh] flex-col rounded-3xl">
        <CardHeader className="flex-row items-center gap-3 border-b border-border pb-4">
          <Link href="/dashboard/conversations" className="text-muted-foreground hover:text-foreground">
            <ArrowRight className="size-4" />
          </Link>
          <CardTitle className="text-base">{data.customer.name || data.customer.phone || "محادثة"}</CardTitle>
          <Badge variant="secondary" className="ms-auto">{data.channel}</Badge>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 overflow-y-auto pt-4">
          {data.messages.map((msg) => (
            <div key={msg.id} className={msg.sender === "CUSTOMER" ? "ms-auto max-w-[75%]" : "me-auto max-w-[80%]"}>
              <div
                className={
                  msg.sender === "CUSTOMER"
                    ? "glass-panel rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm"
                    : "rounded-2xl rounded-tr-sm border border-border bg-card/70 px-4 py-2.5 text-sm backdrop-blur-xl"
                }
              >
                {msg.content}
              </div>
              <div className="mt-1 flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
                {msg.sender === "AI" && (
                  <span className="flex items-center gap-1">
                    <Sparkles className="size-3" /> AI
                  </span>
                )}
                {msg.confidenceScore && (
                  <Badge variant={confidenceVariant[msg.confidenceScore as keyof typeof confidenceVariant]} className="h-4 px-1.5 text-[10px]">
                    {msg.confidenceScore}
                  </Badge>
                )}
                <span>{new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="h-fit rounded-3xl">
        <CardHeader className="flex-row items-center gap-2">
          <User className="size-4 text-primary" />
          <CardTitle className="text-sm">بيانات العميل</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">الاسم</div>
            <div>{data.customer.name || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">الرقم</div>
            <div>{data.customer.phone || "—"}</div>
          </div>
          {data.customer.email && (
            <div>
              <div className="text-xs text-muted-foreground">الإيميل</div>
              <div>{data.customer.email}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground">عدد الرسائل</div>
            <div>{data.messages.length}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
