"use client";

// PROPOSAL — target path: app/(app)/settings/employees/page.tsx (new file)

import { useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type Employee,
  type EmployeeRole,
  useCreateEmployee,
  useDeleteEmployee,
  useEmployees,
  useUpdateEmployee,
} from "@/features/ai/hooks/use-employees";

const ROLE_LABEL: Record<EmployeeRole, string> = {
  GENERAL: "عام",
  SUPPORT: "دعم فني",
  SALES: "مبيعات",
  RECEPTIONIST: "استقبال",
  BOOKING: "حجوزات",
  MARKETING: "تسويق",
  FINANCE: "مالية",
  CRM: "إدارة علاقات العملاء",
  ANALYTICS: "تحليلات",
  KNOWLEDGE_MANAGER: "إدارة المعرفة",
};

export default function EmployeesSettingsPage() {
  const { data: employees, isLoading } = useEmployees();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const createEmployee = useCreateEmployee();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "SUPPORT" as EmployeeRole,
    welcomeMessage: "أهلاً! إزاي أقدر أساعدك؟",
    businessDescription: "",
    systemInstructions: "",
    canManageBookings: false,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">الموظفين الأذكياء ({employees?.length ?? "..."})</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              موظف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>موظف ذكي جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>الاسم</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الدور</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as EmployeeRole })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as EmployeeRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>رسالة الترحيب</Label>
                <Input value={form.welcomeMessage} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>وصف مختصر لدور الموظف ده</Label>
                <Textarea
                  value={form.businessDescription}
                  onChange={(e) => setForm({ ...form, businessDescription: e.target.value })}
                  placeholder="مثلاً: مسؤول بس عن الرد على أسئلة الأسعار والمتابعة مع العملاء المحتملين"
                />
              </div>
              <div className="space-y-1.5">
                <Label>تعليمات إضافية (اختياري)</Label>
                <Textarea
                  value={form.systemInstructions}
                  onChange={(e) => setForm({ ...form, systemInstructions: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.canManageBookings}
                  onChange={(e) => setForm({ ...form, canManageBookings: e.target.checked })}
                />
                يقدر يحجز ويلغي مواعيد
              </label>
              <Button
                className="w-full"
                disabled={!form.name || !form.businessDescription || createEmployee.isPending}
                onClick={() =>
                  createEmployee.mutate(
                    { ...form, systemInstructions: form.systemInstructions || form.businessDescription },
                    {
                      onSuccess: () => {
                        setOpen(false);
                        setForm({ ...form, name: "", businessDescription: "", systemInstructions: "" });
                      },
                    }
                  )
                }
              >
                {createEmployee.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">بيتحمّل...</p>
        ) : (
          (employees ?? []).map((emp: Employee) => (
            <Card key={emp.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{emp.name}</div>
                  {emp.isDefault && (
                    <Badge>
                      <Star className="me-1 size-3" />
                      افتراضي
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary">{ROLE_LABEL[emp.role]}</Badge>

                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={emp.canManageBookings}
                    onChange={(e) => updateEmployee.mutate({ employeeId: emp.id, canManageBookings: e.target.checked })}
                  />
                  يقدر يدير الحجوزات
                </label>

                <div className="flex gap-2 pt-1">
                  {!emp.isDefault && (
                    <button
                      onClick={() => updateEmployee.mutate({ employeeId: emp.id, isDefault: true })}
                      className="rounded-lg border px-2.5 py-1.5 text-xs hover:bg-muted"
                    >
                      خليه الافتراضي
                    </button>
                  )}
                  {!emp.isDefault && (
                    <button
                      onClick={() => deleteEmployee.mutate(emp.id)}
                      className="rounded-lg border px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
