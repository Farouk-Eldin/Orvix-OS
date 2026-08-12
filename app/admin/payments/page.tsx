"use client";

import { useAdminPayments } from "@/features/admin/hooks/use-admin";

interface PaymentRow {
  id: string;
  amount: string;
  currency: string;
  status: string;
  paymentMethod: string | null;
  invoiceNumber: string | null;
  createdAt: string;
  workspace: { name: string; slug: string };
}

const statusColor: Record<string, string> = {
  PAID: "bg-emerald-500/20 text-emerald-300",
  PENDING: "bg-amber-500/20 text-amber-300",
  FAILED: "bg-red-500/20 text-red-300",
  EXPIRED: "bg-white/10 text-white/50",
  CANCELLED: "bg-white/10 text-white/50",
  REFUNDED: "bg-blue-500/20 text-blue-300",
};

export default function AdminPaymentsPage() {
  const { data: payments, isLoading } = useAdminPayments() as { data: PaymentRow[] | undefined; isLoading: boolean };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">سجل المدفوعات</h1>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-white/50">
            <tr>
              <th className="p-3 text-start font-medium">النشاط</th>
              <th className="p-3 text-start font-medium">المبلغ</th>
              <th className="p-3 text-start font-medium">الوسيلة</th>
              <th className="p-3 text-start font-medium">الحالة</th>
              <th className="p-3 text-start font-medium">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-white/40">بيتحمّل...</td>
              </tr>
            ) : !payments?.length ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-white/40">مفيش مدفوعات لسه</td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">{p.workspace.name}</td>
                  <td className="p-3">{p.amount} {p.currency}</td>
                  <td className="p-3">{p.paymentMethod ?? "—"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor[p.status] ?? "bg-white/10"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-white/50">{new Date(p.createdAt).toLocaleDateString("ar-EG")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
