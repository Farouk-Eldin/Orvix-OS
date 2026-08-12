"use client";

// PROPOSAL — target path: app/(app)/dashboard/customers/page.tsx (new file)

import { useState } from "react";
import Link from "next/link";
import { Download, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCustomers } from "@/features/crm/hooks/use-customers";

interface CustomerRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  createdAt: string;
}

const STATUS_LABEL: Record<CustomerRow["status"], string> = {
  ACTIVE: "نشط",
  INACTIVE: "غير نشط",
  BLOCKED: "محظور",
};

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useCustomers({ search: search || undefined }) as {
    data: { customers: CustomerRow[]; total: number } | undefined;
    isLoading: boolean;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">العملاء ({data?.total ?? "..."})</h1>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/v1/customers/export">
            <Download className="size-3.5" />
            تصدير CSV
          </a>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف أو الإيميل..."
          className="w-full max-w-md rounded-xl border bg-background py-2 pe-9 ps-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3 text-start font-medium">الاسم</th>
                  <th className="p-3 text-start font-medium">الهاتف</th>
                  <th className="p-3 text-start font-medium">الإيميل</th>
                  <th className="p-3 text-start font-medium">الحالة</th>
                  <th className="p-3 text-start font-medium">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      بيتحمّل...
                    </td>
                  </tr>
                ) : !data?.customers.length ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      مفيش عملاء لسه
                    </td>
                  </tr>
                ) : (
                  data.customers.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3">
                        <Link href={`/dashboard/customers/${c.id}`} className="font-medium hover:underline">
                          {c.name ?? "بدون اسم"}
                        </Link>
                      </td>
                      <td className="p-3">{c.phone ?? "—"}</td>
                      <td className="p-3">{c.email ?? "—"}</td>
                      <td className="p-3">
                        <Badge variant={c.status === "BLOCKED" ? "destructive" : c.status === "ACTIVE" ? "default" : "secondary"}>
                          {STATUS_LABEL[c.status]}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("ar-EG")}</td>
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
