"use client";

// PROPOSAL — target path: app/(app)/settings/resources/page.tsx (new file)

import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useResources } from "@/features/booking/hooks/use-bookings";
import type { ApiResponse } from "@/types/api";

type ResourceKind = "PERSON" | "SPACE" | "ASSET" | "GENERIC";
const KIND_LABEL: Record<ResourceKind, string> = {
  PERSON: "شخص (دكتور، مدرّب...)",
  SPACE: "مكان (طاولة، غرفة...)",
  ASSET: "معدّة",
  GENERIC: "عام",
};

const DAYS: { key: string; label: string }[] = [
  { key: "sun", label: "الأحد" },
  { key: "mon", label: "الاثنين" },
  { key: "tue", label: "الثلاثاء" },
  { key: "wed", label: "الأربعاء" },
  { key: "thu", label: "الخميس" },
  { key: "fri", label: "الجمعة" },
  { key: "sat", label: "السبت" },
];

interface Resource {
  id: string;
  name: string;
  kind: ResourceKind;
  maxPerSlot: number;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

function useCreateResource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      kind: ResourceKind;
      maxPerSlot: number;
      workingHours: Record<string, { open: string; close: string }[]>;
    }) =>
      fetchJson("/api/v1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تم إضافة المورد");
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export default function ResourcesSettingsPage() {
  const { data: resources, isLoading } = useResources() as { data: Resource[] | undefined; isLoading: boolean };
  const createResource = useCreateResource();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ResourceKind>("PERSON");
  const [maxPerSlot, setMaxPerSlot] = useState("1");
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({ sun: true, mon: true, tue: true, wed: true, thu: true, fri: false, sat: false });
  const [hours, setHours] = useState<Record<string, { open: string; close: string }>>(
    Object.fromEntries(DAYS.map((d) => [d.key, { open: "09:00", close: "17:00" }]))
  );

  function submit() {
    const workingHours: Record<string, { open: string; close: string }[]> = {};
    for (const d of DAYS) {
      const dayHours = hours[d.key] ?? { open: "09:00", close: "17:00" };
      workingHours[d.key] = openDays[d.key] ? [dayHours] : [];
    }

    createResource.mutate(
      { name, kind, maxPerSlot: Number(maxPerSlot), workingHours },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">الموارد ({resources?.length ?? "..."})</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              مورد جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>مورد جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>الاسم</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="د. أحمد، طاولة ٤..." />
              </div>

              <div className="space-y-1.5">
                <Label>النوع</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as ResourceKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(KIND_LABEL) as ResourceKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>أقصى عدد حجوزات في نفس الوقت</Label>
                <Input type="number" min={1} value={maxPerSlot} onChange={(e) => setMaxPerSlot(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>ساعات العمل</Label>
                {DAYS.map((d) => {
                  const dayHours = hours[d.key] ?? { open: "09:00", close: "17:00" };
                  return (
                  <div key={d.key} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenDays({ ...openDays, [d.key]: !openDays[d.key] })}
                      className={`w-20 shrink-0 rounded-lg border px-2 py-1.5 text-xs ${
                        openDays[d.key] ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {d.label}
                    </button>
                    {openDays[d.key] ? (
                      <>
                        <Input
                          type="time"
                          className="h-8"
                          value={dayHours.open}
                          onChange={(e) => setHours({ ...hours, [d.key]: { ...dayHours, open: e.target.value } })}
                        />
                        <span className="text-muted-foreground">—</span>
                        <Input
                          type="time"
                          className="h-8"
                          value={dayHours.close}
                          onChange={(e) => setHours({ ...hours, [d.key]: { ...dayHours, close: e.target.value } })}
                        />
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">إجازة</span>
                    )}
                  </div>
                  );
                })}
              </div>

              <Button className="w-full" disabled={!name || createResource.isPending} onClick={submit}>
                {createResource.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">بيتحمّل...</p>
        ) : !resources?.length ? (
          <p className="text-sm text-muted-foreground">لسه مفيش موارد. لو مفيش، الـ AI هيستخدم ساعات عمل النشاط العامة.</p>
        ) : (
          resources.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-1 p-4">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {KIND_LABEL[r.kind]} · حد أقصى {r.maxPerSlot} في نفس الوقت
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
