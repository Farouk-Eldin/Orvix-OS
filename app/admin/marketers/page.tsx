"use client";

// PROPOSAL — target path: app/admin/marketers/page.tsx (new file)
// Dark theme (bg-white/5, border-white/10) matching the real existing
// admin pages (app/admin/page.tsx, app/admin/workspaces/page.tsx) —
// deliberately different from the light customer-facing dashboard.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Copy } from "lucide-react";

import type { ApiResponse } from "@/types/api";

interface MarketerRow {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  status: "ACTIVE" | "DISABLED";
  totalReferrals: number;
  converted: number;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function AdminMarketersPage() {
  const queryClient = useQueryClient();
  const { data: marketers, isLoading } = useQuery({
    queryKey: ["admin", "marketers"],
    queryFn: () => fetchJson<MarketerRow[]>("/api/admin/marketers"),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", referralCode: "" });

  const createMarketer = useMutation({
    mutationFn: () =>
      fetchJson("/api/admin/marketers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      toast.success("تم إضافة المسوّق");
      queryClient.invalidateQueries({ queryKey: ["admin", "marketers"] });
      setShowForm(false);
      setForm({ name: "", email: "", referralCode: "" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">المسوّقين والدعوات</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
        >
          <Plus className="size-4" />
          مسوّق جديد
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <input
            placeholder="الاسم"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          />
          <input
            placeholder="الإيميل"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          />
          <input
            placeholder="كود الدعوة (مثلاً AHMED2026)"
            value={form.referralCode}
            onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })}
            className="w-full rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          />
          <button
            disabled={!form.name || !form.email || !form.referralCode || createMarketer.isPending}
            onClick={() => createMarketer.mutate()}
            className="rounded-lg bg-white text-black px-3 py-2 text-sm font-medium disabled:opacity-40"
          >
            {createMarketer.isPending ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="p-3 text-start font-medium">الاسم</th>
              <th className="p-3 text-start font-medium">كود الدعوة</th>
              <th className="p-3 text-start font-medium">إجمالي التسجيلات</th>
              <th className="p-3 text-start font-medium">تحويل لمدفوع</th>
              <th className="p-3 text-start font-medium">نسبة التحويل</th>
              <th className="p-3 text-start font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-white/50">بيتحمّل...</td>
              </tr>
            ) : !marketers?.length ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-white/50">لسه مفيش مسوّقين</td>
              </tr>
            ) : (
              marketers.map((m) => (
                <tr key={m.id} className="cursor-pointer hover:bg-white/[0.03]" onClick={() => (window.location.href = `/admin/marketers/${m.id}`)}>
                  <td className="p-3">
                    <div>{m.name}</div>
                    <div className="text-xs text-white/40">{m.email}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs">{m.referralCode}</code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`https://orvixos.com/register?ref=${m.referralCode}`);
                          toast.success("اتنسخ الرابط");
                        }}
                        className="text-white/40 hover:text-white"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3">{m.totalReferrals}</td>
                  <td className="p-3">{m.converted}</td>
                  <td className="p-3">{m.totalReferrals ? Math.round((m.converted / m.totalReferrals) * 100) : 0}%</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${m.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-400" : "bg-white/10 text-white/50"}`}>
                      {m.status === "ACTIVE" ? "فعّال" : "معطّل"}
                    </span>
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
