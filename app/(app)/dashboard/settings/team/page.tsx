"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Users, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ApiResponse } from "@/types/api";

interface TeamMemberRow {
  id: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  permissions: string[] | null;
  user: { name: string; email: string; avatar: string | null };
}

const PERMISSION_LABELS: Record<string, string> = {
  "bookings:write": "إدارة الحجوزات",
  "crm:write": "تعديل بيانات العملاء",
  "knowledge:manage": "حذف/تعديل قاعدة المعرفة",
  "billing:manage": "الاشتراك والفواتير",
  "team:manage": "إدارة الفريق",
  "settings:manage": "إعدادات النشاط",
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function TeamSettingsPage() {
  const queryClient = useQueryClient();
  const { data: members, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: () => fetchJson<TeamMemberRow[]>("/api/v1/team"),
  });

  const updateRole = useMutation({
    mutationFn: (input: { memberId: string; role: "ADMIN" | "MEMBER" }) =>
      fetchJson("/api/v1/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("تم التحديث");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeMember = useMutation({
    mutationFn: (memberId: string) => fetchJson(`/api/v1/team?memberId=${memberId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم الحذف");
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updatePermissions = useMutation({
    mutationFn: (input: { memberId: string; permissions: string[] }) =>
      fetchJson("/api/v1/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  function togglePermission(member: TeamMemberRow, permission: string) {
    const current = member.permissions ?? [];
    const next = current.includes(permission) ? current.filter((p) => p !== permission) : [...current, permission];
    updatePermissions.mutate({ memberId: member.id, permissions: next });
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Users className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">فريق العمل</h1>
          <p className="text-sm text-muted-foreground">إدارة أدوار الأعضاء الحاليين في النشاط</p>
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          [1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/50" />)
        ) : (
          members?.map((member) => (
            <Card key={member.id} className="space-y-3 rounded-2xl p-4">
              <div className="flex flex-row items-center gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {member.user.name.slice(0, 2)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{member.user.name}</div>
                  <div className="text-sm text-muted-foreground">{member.user.email}</div>
                </div>

                {member.role === "OWNER" ? (
                  <Badge>مالك</Badge>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select
                      value={member.role}
                      onValueChange={(role) => updateRole.mutate({ memberId: member.id, role: role as "ADMIN" | "MEMBER" })}
                    >
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">أدمن</SelectItem>
                        <SelectItem value="MEMBER">عضو</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => removeMember.mutate(member.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Only MEMBER is gated by these — OWNER/ADMIN already pass every permission check regardless. */}
              {member.role === "MEMBER" && (
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                    const active = member.permissions?.includes(key) ?? false;
                    return (
                      <button
                        key={key}
                        onClick={() => togglePermission(member, key)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        دعوة أعضاء جدد بإيميل هتتضاف قريبًا — دلوقتي الأعضاء بينضموا لما يسجّلوا عن طريق نفس حساب النشاط.
      </p>
    </div>
  );
}
