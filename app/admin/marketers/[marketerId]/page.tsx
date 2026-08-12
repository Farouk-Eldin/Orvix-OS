"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

interface WithdrawalRow {
  id: string;
  amount: string;
  method: "VODAFONE_CASH" | "BANK_TRANSFER";
  accountDetails: string;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  requestedAt: string;
}
interface MarketerDetail {
  marketer: { id: string; name: string; email: string };
  convertedCount: number;
  commissionPerConversionEgp: number;
  totalEarned: number;
  totalWithdrawn: number;
  availableBalance: number;
  withdrawals: WithdrawalRow[];
}

const METHOD_LABEL: Record<string, string> = { VODAFONE_CASH: "فودافون كاش", BANK_TRANSFER: "تحويل بنكي" };
const STATUS_LABEL: Record<string, string> = { PENDING: "معلّق", APPROVED: "مقبول", PAID: "اتدفع", REJECTED: "مرفوض" };
const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400",
  APPROVED: "bg-blue-500/15 text-blue-400",
  PAID: "bg-emerald-500/15 text-emerald-400",
  REJECTED: "bg-red-500/15 text-red-400",
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function AdminMarketerDetailPage() {
  const { marketerId } = useParams<{ marketerId: string }>();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"VODAFONE_CASH" | "BANK_TRANSFER">("VODAFONE_CASH");
  const [accountDetails, setAccountDetails] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "marketer", marketerId],
    queryFn: () => fetchJson<MarketerDetail>(`/api/admin/marketers/${marketerId}`),
  });

  const createWithdrawal = useMutation({
    mutationFn: () =>
      fetchJson(`/api/admin/marketers/${marketerId}/withdrawals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), method, accountDetails }),
      }),
    onSuccess: () => {
      toast.success("تم تسجيل الطلب");
      queryClient.invalidateQueries({ queryKey: ["admin", "marketer", marketerId] });
      setAmount("");
      setAccountDetails("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: (input: { id: string; status: string }) =>
      fetchJson(`/api/admin/withdrawals/${input.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: () => {
      toast.success("تم التحديث");
      queryClient.invalidateQueries({ queryKey: ["admin", "marketer", marketerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <p className="text-sm text-white/50">بيتحمّل...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold">{data.marketer.name}</h1>
        <p className="text-sm text-white/50">{data.marketer.email}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "تحويلات ناجحة", value: data.convertedCount },
          { label: "عمولة الواحدة", value: `${data.commissionPerConversionEgp} ج.م` },
          { label: "إجمالي المكتسب", value: `${data.totalEarned} ج.م` },
          { label: "الرصيد المتاح", value: `${data.availableBalance} ج.م` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-white/50">{s.label}</div>
            <div className="mt-1 text-xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">تسجيل طلب سحب</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="المبلغ"
            type="number"
            className="rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          />
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as "VODAFONE_CASH" | "BANK_TRANSFER")}
            className="rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          >
            <option value="VODAFONE_CASH">فودافون كاش</option>
            <option value="BANK_TRANSFER">تحويل بنكي</option>
          </select>
          <input
            value={accountDetails}
            onChange={(e) => setAccountDetails(e.target.value)}
            placeholder="رقم المحفظة / الحساب"
            className="rounded-lg border border-white/10 bg-black/20 p-2 text-sm outline-none"
          />
        </div>
        <button
          disabled={!amount || !accountDetails || createWithdrawal.isPending}
          onClick={() => createWithdrawal.mutate()}
          className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black disabled:opacity-40"
        >
          تسجيل الطلب
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="p-3 text-start font-medium">المبلغ</th>
              <th className="p-3 text-start font-medium">الطريقة</th>
              <th className="p-3 text-start font-medium">الحساب</th>
              <th className="p-3 text-start font-medium">الحالة</th>
              <th className="p-3 text-start font-medium">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {data.withdrawals.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-white/50">مفيش طلبات سحب</td>
              </tr>
            ) : (
              data.withdrawals.map((w) => (
                <tr key={w.id}>
                  <td className="p-3">{w.amount} ج.م</td>
                  <td className="p-3 text-white/70">{METHOD_LABEL[w.method]}</td>
                  <td className="p-3 text-white/70">{w.accountDetails}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[w.status]}`}>
                      {STATUS_LABEL[w.status]}
                    </span>
                  </td>
                  <td className="p-3">
                    {w.status === "PENDING" && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => updateStatus.mutate({ id: w.id, status: "APPROVED" })}
                          className="rounded-md bg-blue-500/15 px-2 py-1 text-xs text-blue-400"
                        >
                          قبول
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({ id: w.id, status: "REJECTED" })}
                          className="rounded-md bg-red-500/15 px-2 py-1 text-xs text-red-400"
                        >
                          رفض
                        </button>
                      </div>
                    )}
                    {w.status === "APPROVED" && (
                      <button
                        onClick={() => updateStatus.mutate({ id: w.id, status: "PAID" })}
                        className="rounded-md bg-emerald-500/15 px-2 py-1 text-xs text-emerald-400"
                      >
                        تأكيد الدفع
                      </button>
                    )}
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
