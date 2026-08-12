"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiResponse } from "@/types/api";

interface BranchRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  _count: { resources: number };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetchJson<BranchRow[]>("/api/v1/branches"),
  });

  const createBranch = useMutation({
    mutationFn: () =>
      fetchJson("/api/v1/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone }),
      }),
    onSuccess: () => {
      toast.success("تم إضافة الفرع");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setOpen(false);
      setName("");
      setAddress("");
      setPhone("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteBranch = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/v1/branches/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم الحذف");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <MapPin className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold">الفروع</h1>
            <p className="text-sm text-muted-foreground">لو النشاط أكتر من مكان — كل فرع له عنوان وموظفين خاصين بيه</p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              فرع جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>فرع جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>اسم الفرع</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="فرع مدينة نصر" />
              </div>
              <div className="space-y-1.5">
                <Label>العنوان</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>رقم الفرع</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button className="w-full" disabled={!name || createBranch.isPending} onClick={() => createBranch.mutate()}>
                {createBranch.isPending ? "جاري الإضافة..." : "إضافة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!branches?.length && !isLoading && (
        <p className="text-sm text-muted-foreground">
          لسه مفيش فروع مضافة — من غير فروع، النشاط بيتعامل كمكان واحد زي العادة.
        </p>
      )}

      <div className="space-y-2">
        {branches?.map((branch) => (
          <Card key={branch.id} className="flex flex-row items-center gap-4 rounded-2xl p-4">
            <div className="min-w-0 flex-1">
              <div className="font-medium">{branch.name}</div>
              <div className="text-sm text-muted-foreground">
                {[branch.address, branch.phone].filter(Boolean).join(" · ") || "—"} · {branch._count.resources} موظف/مورد
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteBranch.mutate(branch.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
