"use client";

// PROPOSAL — target path: app/(app)/dashboard/pipeline/page.tsx (new file)
// No @dnd-kit or similar is installed in the project, so this ships with
// move buttons instead of drag handles — real and working now. True
// drag-and-drop is a drop-in upgrade later (add @dnd-kit/core, swap the
// button group for a drag handle) once that dependency is actually there.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiResponse } from "@/types/api";

type Stage = "NEW" | "CONTACTED" | "QUALIFIED" | "NEGOTIATION" | "WON" | "LOST";
const STAGES: { key: Stage; label: string }[] = [
  { key: "NEW", label: "جديد" },
  { key: "CONTACTED", label: "تم التواصل" },
  { key: "QUALIFIED", label: "مؤهّل" },
  { key: "NEGOTIATION", label: "تفاوض" },
  { key: "WON", label: "تم الفوز" },
  { key: "LOST", label: "خسارة" },
];

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  stage: Stage;
  probability: number;
  assignedUser: { name: string | null } | null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

function useLeads() {
  return useQuery({ queryKey: ["leads"], queryFn: () => fetchJson<Lead[]>("/api/v1/leads") });
}

function useMoveLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: Stage }) =>
      fetchJson(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      }),
    onSuccess: (_data, variables) => {
      toast.success(variables.stage === "WON" ? "تم التحويل لعميل فعلي" : "تم النقل");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      if (variables.stage === "WON") queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone?: string; email?: string; source?: string }) =>
      fetchJson("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تمت الإضافة");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export default function PipelinePage() {
  const { data: leads, isLoading } = useLeads();
  const moveLead = useMoveLead();
  const createLead = useCreateLead();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  if (isLoading) return <p className="text-sm text-muted-foreground">بيتحمّل...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">مسار المبيعات</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              عميل محتمل جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>عميل محتمل جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>الاسم</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الهاتف</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الإيميل (اختياري)</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <Button
                className="w-full"
                disabled={!form.name || createLead.isPending}
                onClick={() =>
                  createLead.mutate(
                    { name: form.name, phone: form.phone || undefined, email: form.email || undefined },
                    { onSuccess: () => { setOpen(false); setForm({ name: "", phone: "", email: "" }); } }
                  )
                }
              >
                {createLead.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((stage, stageIndex) => {
          const stageLeads = (leads ?? []).filter((l) => l.stage === stage.key);

          return (
            <div key={stage.key} className="min-w-[220px] space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-semibold">{stage.label}</span>
                <Badge variant="secondary">{stageLeads.length}</Badge>
              </div>

              <div className="space-y-2">
                {stageLeads.map((lead) => (
                  <Card key={lead.id}>
                    <CardContent className="space-y-2 p-3">
                      <div className="text-sm font-medium">{lead.name}</div>
                      {lead.phone && <div className="text-xs text-muted-foreground">{lead.phone}</div>}
                      {lead.assignedUser?.name && (
                        <div className="text-xs text-muted-foreground">مسؤول: {lead.assignedUser.name}</div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        {(() => {
                          const prevStage = STAGES[stageIndex - 1];
                          const nextStage = STAGES[stageIndex + 1];
                          return (
                            <>
                              <button
                                disabled={stageIndex === 0 || moveLead.isPending}
                                onClick={() => prevStage && moveLead.mutate({ leadId: lead.id, stage: prevStage.key })}
                                className="rounded-md p-1 hover:bg-muted disabled:opacity-30"
                                aria-label="رجّع مرحلة"
                              >
                                <ChevronRight className="size-4" />
                              </button>
                              <button
                                disabled={stageIndex === STAGES.length - 1 || moveLead.isPending}
                                onClick={() => nextStage && moveLead.mutate({ leadId: lead.id, stage: nextStage.key })}
                                className="rounded-md p-1 hover:bg-muted disabled:opacity-30"
                                aria-label="قدّم مرحلة"
                              >
                                <ChevronLeft className="size-4" />
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {stageLeads.length === 0 && <div className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">فاضي</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
