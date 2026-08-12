"use client";

import { useState } from "react";
import { Search, Ban, CheckCircle2 } from "lucide-react";

import { useAdminWorkspaces, useWorkspaceAction } from "@/features/admin/hooks/use-admin";

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  suspended: boolean;
  createdAt: string;
  subscription: { status: string; plan: string } | null;
  _count: { customers: number; conversations: number };
}

export default function AdminWorkspacesPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminWorkspaces(search) as {
    data: { workspaces: WorkspaceRow[]; total: number } | undefined;
    isLoading: boolean;
  };
  const action = useWorkspaceAction();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">الأنشطة ({data?.total ?? "..."})</h1>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الرابط..."
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pe-9 ps-3 text-sm outline-none placeholder:text-white/40"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="p-3 text-start font-medium">النشاط</th>
              <th className="p-3 text-start font-medium">الاشتراك</th>
              <th className="p-3 text-start font-medium">العملاء</th>
              <th className="p-3 text-start font-medium">الحالة</th>
              <th className="p-3 text-start font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-white/40">
                  بيتحمّل...
                </td>
              </tr>
            ) : !data?.workspaces.length ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-white/40">
                  مفيش نتائج
                </td>
              </tr>
            ) : (
              data.workspaces.map((ws) => (
                <tr key={ws.id}>
                  <td className="p-3">
                    <div className="font-medium">{ws.name}</div>
                    <div className="text-xs text-white/40">{ws.slug}</div>
                  </td>
                  <td className="p-3">{ws.subscription?.plan ?? "—"} / {ws.subscription?.status ?? "—"}</td>
                  <td className="p-3">{ws._count.customers}</td>
                  <td className="p-3">
                    {ws.suspended ? (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-300">موقوف</span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">نشط</span>
                    )}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() =>
                        action.mutate({ workspaceId: ws.id, action: ws.suspended ? "activate" : "suspend" })
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs hover:bg-white/10"
                    >
                      {ws.suspended ? <CheckCircle2 className="size-3.5" /> : <Ban className="size-3.5" />}
                      {ws.suspended ? "تفعيل" : "إيقاف"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
