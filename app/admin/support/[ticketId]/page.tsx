"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import { useAdminReplyToTicket, useAdminTicketDetail, useUpdateAdminTicket } from "@/features/support/hooks/use-admin-tickets";
import {
  TICKET_PRIORITY_ADMIN_CLASS,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_ADMIN_CLASS,
  TICKET_STATUS_LABEL,
} from "@/features/support/lib/ticket-labels";

interface TicketMessage {
  id: string;
  body: string;
  isInternalNote: boolean;
  createdAt: string;
  author: { id: string; name: string | null; isSuperAdmin: boolean };
}
interface AdminTicketDetail {
  id: string;
  subject: string;
  status: string;
  priority: string;
  assignedAdminId: string | null;
  workspace: { id: string; name: string };
  createdBy: { id: string; name: string | null; email: string | null };
  messages: TicketMessage[];
}

export default function AdminSupportTicketPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { data: ticket, isLoading } = useAdminTicketDetail(ticketId) as {
    data: AdminTicketDetail | undefined;
    isLoading: boolean;
  };
  const update = useUpdateAdminTicket(ticketId);
  const reply = useAdminReplyToTicket(ticketId);
  const [body, setBody] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);

  if (isLoading || !ticket) {
    return <p className="text-sm text-white/50">بيتحمّل...</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div>
          <h1 className="text-lg font-bold">{ticket.subject}</h1>
          <p className="text-sm text-white/50">
            {ticket.workspace.name} — {ticket.createdBy.name ?? ticket.createdBy.email}
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          {ticket.messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-xl p-3 text-sm ${
                message.isInternalNote
                  ? "border border-dashed border-amber-500/30 bg-amber-500/10"
                  : message.author.isSuperAdmin
                    ? "bg-white/10"
                    : "bg-blue-500/10"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
                <span className="font-medium text-white/80">
                  {message.author.isSuperAdmin ? (message.author.name ?? "أدمن") : (ticket.createdBy.name ?? "العميل")}
                </span>
                {message.isInternalNote && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                    ملاحظة داخلية
                  </span>
                )}
                <span>{new Date(message.createdAt).toLocaleString("ar-EG")}</span>
              </div>
              <p className="whitespace-pre-wrap text-white/90">{message.body}</p>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={isInternalNote ? "اكتب ملاحظة داخلية (مش هتظهر للعميل)..." : "اكتب ردّك..."}
            className="min-h-24 w-full rounded-lg border border-white/10 bg-black/20 p-2.5 text-sm outline-none"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-white/60">
              <input
                type="checkbox"
                checked={isInternalNote}
                onChange={(e) => setIsInternalNote(e.target.checked)}
                className="size-3.5"
              />
              ملاحظة داخلية بس (مش هترسل للعميل)
            </label>
            <button
              disabled={!body.trim() || reply.isPending}
              onClick={() => reply.mutate({ body: body.trim(), isInternalNote }, { onSuccess: () => setBody("") })}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
              {reply.isPending ? "جاري الإرسال..." : isInternalNote ? "حفظ الملاحظة" : "إرسال الرد"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div>
            <div className="mb-1 text-xs text-white/50">الحالة</div>
            <select
              value={ticket.status}
              onChange={(e) => update.mutate({ status: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
            >
              {Object.entries(TICKET_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value} className="bg-black">
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-white/50">الأولوية</div>
            <select
              value={ticket.priority}
              onChange={(e) => update.mutate({ priority: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
            >
              {Object.entries(TICKET_PRIORITY_LABEL).map(([value, label]) => (
                <option key={value} value={value} className="bg-black">
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs text-white/50">التعيين</div>
            {ticket.assignedAdminId ? (
              <button
                onClick={() => update.mutate({ assignedAdminId: null })}
                className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
              >
                إلغاء التعيين
              </button>
            ) : (
              <button
                onClick={() => update.mutate({ assignedAdminId: "self" })}
                className="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-black"
              >
                تعيين لنفسي
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${TICKET_STATUS_ADMIN_CLASS[ticket.status]}`}>
            {TICKET_STATUS_LABEL[ticket.status]}
          </span>
          <span
            className={`ms-1.5 inline-block rounded-full px-2 py-0.5 text-xs ${TICKET_PRIORITY_ADMIN_CLASS[ticket.priority]}`}
          >
            {TICKET_PRIORITY_LABEL[ticket.priority]}
          </span>
        </div>
      </div>
    </div>
  );
}
