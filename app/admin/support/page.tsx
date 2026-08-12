"use client";

// Dark theme matching the existing admin pages (app/admin/marketers/page.tsx) —
// deliberately different from the light customer-facing dashboard.

import { useState } from "react";
import Link from "next/link";

import { useAdminTickets } from "@/features/support/hooks/use-admin-tickets";
import {
  TICKET_PRIORITY_ADMIN_CLASS,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_ADMIN_CLASS,
  TICKET_STATUS_LABEL,
} from "@/features/support/lib/ticket-labels";

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "الكل" },
  { value: "OPEN", label: "مفتوحة" },
  { value: "IN_PROGRESS", label: "قيد المعالجة" },
  { value: "RESOLVED", label: "تم الحل" },
  { value: "CLOSED", label: "مغلقة" },
];

interface AdminTicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  lastMessageAt: string;
  workspace: { id: string; name: string };
  assignedAdmin: { id: string; name: string | null } | null;
  _count: { messages: number };
}
interface AdminTicketsResponse {
  tickets: AdminTicketRow[];
  total: number;
}

export default function AdminSupportPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAdminTickets({ status: status || undefined, search: search || undefined }) as {
    data: AdminTicketsResponse | undefined;
    isLoading: boolean;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">مركز الدعم الفني</h1>
        <span className="text-sm text-white/50">{data?.total ?? 0} تذكرة</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatus(filter.value)}
              className={`rounded-xl px-3 py-1.5 text-sm transition-colors ${
                status === filter.value ? "bg-white text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="دوّر بالموضوع أو اسم النشاط..."
          className="w-64 rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="p-3 text-start font-medium">الموضوع</th>
              <th className="p-3 text-start font-medium">النشاط</th>
              <th className="p-3 text-start font-medium">الأولوية</th>
              <th className="p-3 text-start font-medium">الحالة</th>
              <th className="p-3 text-start font-medium">المسؤول</th>
              <th className="p-3 text-start font-medium">آخر تحديث</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-white/50">
                  بيتحمّل...
                </td>
              </tr>
            ) : !data?.tickets.length ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-white/50">
                  مفيش تذاكر مطابقة
                </td>
              </tr>
            ) : (
              data.tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-white/[0.03]">
                  <td className="p-3">
                    <Link href={`/admin/support/${ticket.id}`} className="font-medium hover:underline">
                      {ticket.subject}
                    </Link>
                    <div className="text-xs text-white/40">{ticket._count.messages} ردّ</div>
                  </td>
                  <td className="p-3 text-white/70">{ticket.workspace.name}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${TICKET_PRIORITY_ADMIN_CLASS[ticket.priority]}`}
                    >
                      {TICKET_PRIORITY_LABEL[ticket.priority]}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${TICKET_STATUS_ADMIN_CLASS[ticket.status]}`}>
                      {TICKET_STATUS_LABEL[ticket.status]}
                    </span>
                  </td>
                  <td className="p-3 text-white/70">{ticket.assignedAdmin?.name ?? "—"}</td>
                  <td className="p-3 text-white/50">{new Date(ticket.lastMessageAt).toLocaleString("ar-EG")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
