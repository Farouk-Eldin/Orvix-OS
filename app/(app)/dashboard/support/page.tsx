"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NewTicketDialog } from "@/features/support/components/new-ticket-dialog";
import { useTickets } from "@/features/support/hooks/use-tickets";
import {
  TICKET_PRIORITY_BADGE_VARIANT,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_BADGE_VARIANT,
  TICKET_STATUS_LABEL,
} from "@/features/support/lib/ticket-labels";

interface TicketListItem {
  id: string;
  subject: string;
  status: string;
  priority: string;
  lastMessageAt: string;
  _count: { messages: number };
}

export default function SupportTicketsPage() {
  const { data: tickets, isLoading } = useTickets() as { data: TicketListItem[] | undefined; isLoading: boolean };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">الدعم الفني</h1>
          <p className="text-sm text-muted-foreground">أي مشكلة في المنصة؟ ابعتلنا تذكرة وهنردّ عليك من هنا.</p>
        </div>
        <NewTicketDialog />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">بيتحمّل...</p>
          ) : !tickets || tickets.length === 0 ? (
            <div className="space-y-2 p-10 text-center">
              <p className="font-medium">مفيش تذاكر لسه</p>
              <p className="text-sm text-muted-foreground">لو محتاج مساعدة في أي حاجة، افتح تذكرة جديدة.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-xs text-muted-foreground">
                  <th className="px-5 py-3 text-start font-medium">الموضوع</th>
                  <th className="px-3 py-3 text-start font-medium">الحالة</th>
                  <th className="px-3 py-3 text-start font-medium">الأولوية</th>
                  <th className="px-3 py-3 text-start font-medium">آخر تحديث</th>
                  <th className="px-3 py-3 text-start font-medium">الردود</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/support/${ticket.id}`} className="font-medium hover:underline">
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={TICKET_STATUS_BADGE_VARIANT[ticket.status]}>
                        {TICKET_STATUS_LABEL[ticket.status]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={TICKET_PRIORITY_BADGE_VARIANT[ticket.priority]}>
                        {TICKET_PRIORITY_LABEL[ticket.priority]}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {new Date(ticket.lastMessageAt).toLocaleString("ar-EG")}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{ticket._count.messages}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
