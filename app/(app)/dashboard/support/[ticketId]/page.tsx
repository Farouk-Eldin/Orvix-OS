"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useCloseTicket, useReplyToTicket, useTicketDetail } from "@/features/support/hooks/use-tickets";
import {
  TICKET_PRIORITY_BADGE_VARIANT,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_BADGE_VARIANT,
  TICKET_STATUS_LABEL,
} from "@/features/support/lib/ticket-labels";

interface TicketMessage {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string | null; isSuperAdmin: boolean };
}
interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  priority: string;
  messages: TicketMessage[];
}

export default function SupportTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { data: ticket, isLoading } = useTicketDetail(ticketId) as {
    data: TicketDetail | undefined;
    isLoading: boolean;
  };
  const reply = useReplyToTicket(ticketId);
  const close = useCloseTicket(ticketId);
  const [body, setBody] = useState("");

  if (isLoading || !ticket) {
    return <p className="text-sm text-muted-foreground">بيتحمّل...</p>;
  }

  const isClosed = ticket.status === "CLOSED";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant={TICKET_STATUS_BADGE_VARIANT[ticket.status]}>{TICKET_STATUS_LABEL[ticket.status]}</Badge>
            <Badge variant={TICKET_PRIORITY_BADGE_VARIANT[ticket.priority]}>
              {TICKET_PRIORITY_LABEL[ticket.priority]}
            </Badge>
          </div>
        </div>
        {!isClosed && (
          <Button variant="outline" size="sm" onClick={() => close.mutate()} disabled={close.isPending}>
            إغلاق التذكرة
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="space-y-5 p-5">
          {ticket.messages.map((message) => (
            <div key={message.id} className={`flex ${message.author.isSuperAdmin ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  message.author.isSuperAdmin ? "bg-secondary" : "bg-primary/10"
                }`}
              >
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  {message.author.isSuperAdmin ? "فريق الدعم" : (message.author.name ?? "أنت")}
                </div>
                <p className="whitespace-pre-wrap">{message.body}</p>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(message.createdAt).toLocaleString("ar-EG")}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {isClosed && (
        <p className="text-center text-sm text-muted-foreground">
          التذكرة دي مقفولة. اكتب ردّ جديد لو حابب تفتحها تاني.
        </p>
      )}
      <div className="flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="اكتب ردّك..."
          className="min-h-16 flex-1"
        />
        <Button
          className="self-end"
          disabled={!body.trim() || reply.isPending}
          onClick={() => reply.mutate(body.trim(), { onSuccess: () => setBody("") })}
        >
          إرسال
        </Button>
      </div>
    </div>
  );
}
