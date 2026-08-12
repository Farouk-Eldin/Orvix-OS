"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import type { ApiResponse } from "@/types/api";

interface AuditLogRow {
  id: string;
  action: string;
  ip: string | null;
  device: string | null;
  createdAt: string;
  workspace: { id: string; name: string };
  user: { id: string; name: string | null; email: string } | null;
}
interface AuditLogsResponse {
  logs: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs", search, page],
    queryFn: () =>
      fetchJson<AuditLogsResponse>(
        `/api/admin/audit-logs?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}`
      ),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">سجل النشاط</h1>
        <span className="text-sm text-white/50">{data?.total ?? 0} حدث</span>
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="دوّر في نوع الحدث... مثلاً support_ticket.closed"
        className="w-80 rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
      />

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="p-3 text-start font-medium">الحدث</th>
              <th className="p-3 text-start font-medium">النشاط</th>
              <th className="p-3 text-start font-medium">المستخدم</th>
              <th className="p-3 text-start font-medium">IP</th>
              <th className="p-3 text-start font-medium">الوقت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-white/50">
                  بيتحمّل...
                </td>
              </tr>
            ) : !data?.logs.length ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-white/50">
                  مفيش أحداث مطابقة
                </td>
              </tr>
            ) : (
              data.logs.map((log) => (
                <tr key={log.id}>
                  <td className="p-3">
                    <code className="text-xs text-white/80">{log.action}</code>
                  </td>
                  <td className="p-3 text-white/70">{log.workspace.name}</td>
                  <td className="p-3 text-white/70">{log.user?.name ?? log.user?.email ?? "—"}</td>
                  <td className="p-3 text-white/40">{log.ip ?? "—"}</td>
                  <td className="p-3 text-white/50">{new Date(log.createdAt).toLocaleString("ar-EG")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-center gap-3 text-sm text-white/60">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg bg-white/5 px-3 py-1.5 hover:bg-white/10 disabled:opacity-30"
          >
            السابق
          </button>
          <span>
            صفحة {page} من {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg bg-white/5 px-3 py-1.5 hover:bg-white/10 disabled:opacity-30"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
