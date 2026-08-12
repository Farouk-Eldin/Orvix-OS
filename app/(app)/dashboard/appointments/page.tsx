"use client";

// PROPOSAL — target path: app/(app)/dashboard/appointments/page.tsx (new file)
// Same raw-<table>-with-Tailwind pattern as app/admin/workspaces/page.tsx,
// but light theme (bg-card/border/text-muted-foreground) to match this
// route group instead of the admin panel's dark theme.

import { useState } from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBookings, useUpdateBooking } from "@/features/booking/hooks/use-bookings";

type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  COMPLETED: "تم",
  CANCELLED: "ملغي",
  NO_SHOW: "لم يحضر",
};

const STATUS_VARIANT: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
  NO_SHOW: "destructive",
};

interface BookingRow {
  id: string;
  startAt: string;
  status: BookingStatus;
  channel: string;
  customer: { name: string | null; phone: string | null };
  service: { name: string };
  resource: { name: string } | null;
}

export default function AppointmentsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BookingStatus | "ALL">("ALL");

  const { data, isLoading } = useBookings({
    search: search || undefined,
    status: status === "ALL" ? undefined : status,
  }) as { data: { bookings: BookingRow[]; total: number } | undefined; isLoading: boolean };

  const updateBooking = useUpdateBooking();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">المواعيد ({data?.total ?? "..."})</h1>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full rounded-xl border bg-background py-2 pe-9 ps-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as BookingStatus | "ALL")}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الحالات</SelectItem>
            {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3 text-start font-medium">العميل</th>
                  <th className="p-3 text-start font-medium">القناة</th>
                  <th className="p-3 text-start font-medium">الخدمة</th>
                  <th className="p-3 text-start font-medium">الموعد</th>
                  <th className="p-3 text-start font-medium">الحالة</th>
                  <th className="p-3 text-start font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      بيتحمّل...
                    </td>
                  </tr>
                ) : !data?.bookings.length ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      مفيش مواعيد
                    </td>
                  </tr>
                ) : (
                  data.bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="p-3">
                        <div className="font-medium">{b.customer.name ?? "بدون اسم"}</div>
                        <div className="text-xs text-muted-foreground">{b.customer.phone ?? "—"}</div>
                      </td>
                      <td className="p-3">{b.channel}</td>
                      <td className="p-3">
                        {b.service.name}
                        {b.resource ? <span className="text-muted-foreground"> · {b.resource.name}</span> : null}
                      </td>
                      <td className="p-3">{new Date(b.startAt).toLocaleString("ar-EG")}</td>
                      <td className="p-3">
                        <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1.5">
                          {b.status === "PENDING" && (
                            <button
                              onClick={() => updateBooking.mutate({ bookingId: b.id, status: "CONFIRMED" })}
                              className="rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted"
                            >
                              تأكيد
                            </button>
                          )}
                          {(b.status === "PENDING" || b.status === "CONFIRMED") && (
                            <>
                              <button
                                onClick={() => updateBooking.mutate({ bookingId: b.id, status: "COMPLETED" })}
                                className="rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted"
                              >
                                تم
                              </button>
                              <button
                                onClick={() => updateBooking.mutate({ bookingId: b.id, status: "CANCELLED" })}
                                className="rounded-lg border px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                              >
                                إلغاء
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
