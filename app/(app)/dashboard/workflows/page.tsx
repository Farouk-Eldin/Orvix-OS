"use client";

// PROPOSAL — target path: app/(app)/dashboard/workflows/page.tsx (replaces existing file)
// UPDATED: adds a "New Workflow" button that creates a blank draft
// (via the existing POST /api/v1/workflows route with a single starter
// trigger node) and redirects straight into the builder canvas — this
// is what makes the canvas from this pass actually reachable.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ApiResponse } from "@/types/api";

interface WorkflowRow {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "DISABLED";
}
interface ExecutionRow {
  id: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  log: { nodeId: string; type: string; status: string; error?: string; ms: number }[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

const STATUS_VARIANT = {
  DRAFT: "secondary",
  PUBLISHED: "default",
  DISABLED: "outline",
  RUNNING: "secondary",
  SUCCESS: "default",
  FAILED: "destructive",
} as const;

export default function WorkflowsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDescription, setAiDescription] = useState("");

  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => fetchJson<WorkflowRow[]>("/api/v1/workflows"),
  });

  const { data: detail } = useQuery({
    queryKey: ["workflow", selected],
    queryFn: () => fetchJson<{ workflow: WorkflowRow; executions: ExecutionRow[] }>(`/api/v1/workflows/${selected}`),
    enabled: !!selected,
  });

  const createWorkflow = useMutation({
    mutationFn: () =>
      fetchJson<{ id: string }>("/api/v1/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          nodes: [{ clientId: "start", type: "TRIGGER_MANUAL", config: {}, positionX: 400, positionY: 150 }],
          edges: [],
        }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      router.push(`/dashboard/workflows/${data.id}/builder`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateWithAi = useMutation({
    mutationFn: () =>
      fetchJson<{ workflow: { id: string } }>("/api/v1/workflows/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: aiDescription }),
      }),
    onSuccess: (data) => {
      toast.success("تم بناء الأتمتة — راجعها قبل النشر");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      setAiOpen(false);
      setAiDescription("");
      router.push(`/dashboard/workflows/${data.workflow.id}/builder`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="space-y-2 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Workflows ({workflows?.length ?? "..."})</h2>
            <div className="flex gap-1.5">
              <Dialog open={aiOpen} onOpenChange={setAiOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Sparkles className="size-3.5" />
                    بناء بالذكاء الاصطناعي
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>بناء أتمتة بوصف نصي</DialogTitle>
                    <DialogDescription>
                      اوصف الأتمتة اللي عايزها بجملك، والـ AI هيبنيها كمسودة تقدر تراجعها وتعدّلها قبل النشر.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Textarea
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="مثال: لما عميل يحجز موعد، سجّل ملاحظة في الـ CRM وابعتله إشعار تأكيد"
                      className="min-h-28"
                    />
                    <Button
                      className="w-full"
                      disabled={aiDescription.trim().length < 10 || generateWithAi.isPending}
                      onClick={() => generateWithAi.mutate()}
                    >
                      {generateWithAi.isPending ? "جاري البناء..." : "ابنِ الأتمتة"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="size-3.5" />
                    جديد
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Workflow جديد</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input placeholder="اسم الـ Workflow" value={name} onChange={(e) => setName(e.target.value)} />
                    <Button
                      className="w-full"
                      disabled={!name || createWorkflow.isPending}
                      onClick={() => createWorkflow.mutate()}
                    >
                      {createWorkflow.isPending ? "جاري الإنشاء..." : "إنشاء وفتح المحرر"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">بيتحمّل...</p>
          ) : !workflows?.length ? (
            <p className="text-sm text-muted-foreground">لسه مفيش workflows — دوس &quot;جديد&quot; عشان تبدأ.</p>
          ) : (
            workflows.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelected(w.id)}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-start text-sm hover:bg-muted ${
                  selected === w.id ? "border-primary" : ""
                }`}
              >
                <span>{w.name}</span>
                <Badge variant={STATUS_VARIANT[w.status]}>{w.status}</Badge>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          {!selected ? (
            <p className="text-sm text-muted-foreground">اختار workflow من القايمة، أو افتحه في المحرر البصري</p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">سجل التنفيذ</h2>
                <Button size="sm" onClick={() => router.push(`/dashboard/workflows/${selected}/builder`)}>
                  افتح في المحرر
                </Button>
              </div>
              {!detail?.executions.length ? (
                <p className="text-sm text-muted-foreground">لسه ماحدش شغّله</p>
              ) : (
                <div className="space-y-3">
                  {detail.executions.map((exec) => (
                    <div key={exec.id} className="rounded-xl border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant={STATUS_VARIANT[exec.status]}>{exec.status}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(exec.startedAt).toLocaleString("ar-EG")}</span>
                      </div>
                      <div className="space-y-1">
                        {exec.log.map((step, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className={step.status === "FAILED" ? "text-destructive" : "text-muted-foreground"}>
                              {step.type} {step.error ? `— ${step.error}` : ""}
                            </span>
                            <span className="text-muted-foreground">{step.ms}ms</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
