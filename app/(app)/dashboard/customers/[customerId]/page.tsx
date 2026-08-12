"use client";

// PROPOSAL — target path: app/(app)/dashboard/customers/[customerId]/page.tsx (new file)

import { useState } from "react";
import { useParams } from "next/navigation";
import { MessageSquare, CalendarCheck, StickyNote, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAddCustomerNote, useCustomerDetail } from "@/features/crm/hooks/use-customers";

interface TimelineConversation {
  kind: "conversation";
  id: string;
  channel: string;
  status: string;
  createdAt: string;
}
interface TimelineBooking {
  kind: "booking";
  id: string;
  status: string;
  startAt: string;
  service: { name: string };
  createdAt: string;
}
interface TimelineNote {
  kind: "note";
  id: string;
  content: string;
  pinned: boolean;
  createdByAI: boolean;
  createdAt: string;
}
type TimelineItem = TimelineConversation | TimelineBooking | TimelineNote;

interface CustomerDetail {
  customer: { id: string; name: string | null; phone: string | null; email: string | null; tags: string[]; status: string };
  timeline: {
    conversations: Omit<TimelineConversation, "kind">[];
    bookings: Omit<TimelineBooking, "kind">[];
    notes: Omit<TimelineNote, "kind">[];
  };
}

function mergeTimeline(t: CustomerDetail["timeline"]): TimelineItem[] {
  const items: TimelineItem[] = [
    ...t.conversations.map((c) => ({ kind: "conversation" as const, ...c })),
    ...t.bookings.map((b) => ({ kind: "booking" as const, ...b })),
    ...t.notes.map((n) => ({ kind: "note" as const, ...n })),
  ];
  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { data, isLoading } = useCustomerDetail(customerId) as { data: CustomerDetail | undefined; isLoading: boolean };
  const addNote = useAddCustomerNote(customerId);
  const [noteText, setNoteText] = useState("");

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">بيتحمّل...</p>;
  }

  const { customer } = data;
  const timeline = mergeTimeline(data.timeline);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="space-y-3 p-5">
          <div>
            <div className="text-lg font-bold">{customer.name ?? "بدون اسم"}</div>
            <Badge variant={customer.status === "BLOCKED" ? "destructive" : "default"} className="mt-1">
              {customer.status}
            </Badge>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>{customer.phone ?? "—"}</div>
            <div>{customer.email ?? "—"}</div>
          </div>
          {customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {customer.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t pt-3">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="ضيف ملاحظة..."
              className="min-h-20"
            />
            <Button
              size="sm"
              className="w-full"
              disabled={!noteText.trim() || addNote.isPending}
              onClick={() => addNote.mutate({ content: noteText }, { onSuccess: () => setNoteText("") })}
            >
              {addNote.isPending ? "جاري الحفظ..." : "إضافة ملاحظة"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="p-5">
          <h2 className="mb-4 font-semibold">السجل الزمني</h2>

          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">مفيش نشاط لسه</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((item) => (
                <TimelineRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const when = new Date(item.createdAt).toLocaleString("ar-EG");

  if (item.kind === "conversation") {
    return (
      <div className="flex items-start gap-3 text-sm">
        <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <div>محادثة عبر {item.channel}</div>
          <div className="text-xs text-muted-foreground">{when}</div>
        </div>
      </div>
    );
  }

  if (item.kind === "booking") {
    return (
      <div className="flex items-start gap-3 text-sm">
        <CalendarCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <div>
            حجز: {item.service.name} — {new Date(item.startAt).toLocaleString("ar-EG")}
          </div>
          <div className="text-xs text-muted-foreground">{when}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 text-sm">
      {item.pinned ? (
        <Pin className="mt-0.5 size-4 shrink-0 text-primary" />
      ) : (
        <StickyNote className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      )}
      <div>
        <div>
          {item.content}
          {item.createdByAI && (
            <Badge variant="outline" className="ms-2">
              AI
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{when}</div>
      </div>
    </div>
  );
}
