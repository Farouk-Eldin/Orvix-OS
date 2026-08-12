"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { History, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ApiResponse } from "@/types/api";

interface VersionRow {
  id: string;
  versionNumber: number;
  name: string;
  createdAt: string;
  publishedBy: { id: string; name: string | null } | null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function VersionHistoryPanel({ workflowId }: { workflowId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["workflow-versions", workflowId],
    queryFn: () => fetchJson<{ versions: VersionRow[] }>(`/api/v1/workflows/${workflowId}/versions`),
    enabled: open,
  });

  const rollback = useMutation({
    mutationFn: (versionId: string) =>
      fetchJson(`/api/v1/workflows/${workflowId}/versions/${versionId}/rollback`, { method: "POST" }),
    onSuccess: () => {
      toast.success("تم الاسترجاع");
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-versions", workflowId] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <History className="size-3.5" />
          سجل النسخ
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>سجل النشر</DialogTitle>
          <DialogDescription>كل مرة تنشر فيها، بتتسجّل نسخة هنا — استرجاع نسخة قديمة بيتسجّل هو نفسه كنسخة جديدة.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">بيتحمّل...</p>
        ) : !data?.versions.length ? (
          <p className="text-sm text-muted-foreground">لسه مفيش نسخة منشورة.</p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {data.versions.map((version, i) => (
              <div key={version.id} className="flex items-center justify-between rounded-xl border p-3 text-sm">
                <div>
                  <div className="font-medium">
                    نسخة {version.versionNumber} {i === 0 && <span className="text-xs text-muted-foreground">(الحالية)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {version.publishedBy?.name ?? "—"} · {new Date(version.createdAt).toLocaleString("ar-EG")}
                  </div>
                </div>
                {i !== 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={rollback.isPending}
                    onClick={() => rollback.mutate(version.id)}
                  >
                    <RotateCcw className="size-3.5" />
                    استرجاع
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
