"use client";

// PROPOSAL — target path: app/(app)/settings/services/page.tsx (new file)

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useServices } from "@/features/booking/hooks/use-bookings";
import type { ApiResponse } from "@/types/api";

interface Service {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number | null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; durationMin: number; price?: number }) =>
      fetchJson("/api/v1/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تم إضافة الخدمة");
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export default function ServicesSettingsPage() {
  const { data: services, isLoading } = useServices() as { data: Service[] | undefined; isLoading: boolean };
  const createService = useCreateService();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", durationMin: "30", price: "" });

  function submit() {
    createService.mutate(
      {
        name: form.name,
        description: form.description || undefined,
        durationMin: Number(form.durationMin),
        price: form.price ? Number(form.price) : undefined,
      },
      { onSuccess: () => { setOpen(false); setForm({ name: "", description: "", durationMin: "30", price: "" }); } }
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">الخدمات ({services?.length ?? "..."})</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              خدمة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>خدمة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>الاسم</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>الوصف (اختياري)</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>المدة (دقيقة)</Label>
                  <Input
                    type="number"
                    value={form.durationMin}
                    onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>السعر (اختياري)</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
              </div>
              <Button className="w-full" disabled={!form.name || createService.isPending} onClick={submit}>
                {createService.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">بيتحمّل...</p>
        ) : !services?.length ? (
          <p className="text-sm text-muted-foreground">لسه مفيش خدمات، ضيف أول خدمة.</p>
        ) : (
          services.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-1.5 p-4">
                <div className="font-medium">{s.name}</div>
                {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{s.durationMin} دقيقة</span>
                  {s.price != null && <span>· {s.price} جنيه</span>}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
