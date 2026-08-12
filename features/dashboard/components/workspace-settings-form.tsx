"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Workspace } from "@prisma/client";
import type { ApiResponse } from "@/types/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function WorkspaceSettingsForm() {
  const queryClient = useQueryClient();
  const { data: workspace, isLoading } = useQuery({
    queryKey: ["workspace"],
    queryFn: () => fetchJson<Workspace>("/api/v1/workspace"),
  });

  const update = useMutation({
    mutationFn: (data: { name: string; logo: string }) =>
      fetchJson("/api/v1/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تم الحفظ");
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const [form, setForm] = useState({ name: "", logo: "" });

  useEffect(() => {
    if (workspace) setForm({ name: workspace.name, logo: workspace.logo ?? "" });
  }, [workspace]);

  if (isLoading) return <div className="h-56 animate-pulse rounded-3xl bg-muted/50" />;

  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex-row items-center gap-2">
        <Building2 className="size-4 text-primary" />
        <CardTitle className="text-base">بيانات النشاط</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>اسم النشاط</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>رابط الشعار</Label>
          <Input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="https://..." />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <div className="text-xs">الدولة</div>
            <div className="text-foreground">{workspace?.country}</div>
          </div>
          <div>
            <div className="text-xs">نوع النشاط</div>
            <div className="text-foreground">{workspace?.businessType}</div>
          </div>
        </div>
        <Button onClick={() => update.mutate(form)} disabled={update.isPending}>
          {update.isPending && <Loader2 className="size-4 animate-spin" />}
          حفظ
        </Button>
      </CardContent>
    </Card>
  );
}
