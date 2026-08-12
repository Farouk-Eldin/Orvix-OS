"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowBigUp, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ApiResponse } from "@/types/api";

interface FeatureRequestRow {
  id: string;
  title: string;
  description: string;
  status: "PLANNED" | "IN_PROGRESS" | "TESTING" | "RELEASED";
  voteCount: number;
  hasVoted: boolean;
  submittedByName: string;
}

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "مخطط له",
  IN_PROGRESS: "شغالين عليه",
  TESTING: "بيتجرّب",
  RELEASED: "مُطلَق",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "success" | "outline"> = {
  PLANNED: "outline",
  IN_PROGRESS: "default",
  TESTING: "secondary",
  RELEASED: "success",
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function FeedbackPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["feedback"],
    queryFn: () => fetchJson<FeatureRequestRow[]>("/api/v1/feedback"),
  });

  const vote = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/v1/feedback/${id}/vote`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedback"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = useMutation({
    mutationFn: () =>
      fetchJson("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      }),
    onSuccess: () => {
      toast.success("شكرًا على اقتراحك");
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      setOpen(false);
      setTitle("");
      setDescription("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">اقتراحات ومسار التطوير</h1>
          <p className="text-sm text-muted-foreground">اقترح فيتشر أو صوّت على اقتراح موجود.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              اقتراح جديد
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>اقتراح جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="عنوان الاقتراح" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea
                placeholder="اشرح الفيتشر واللي هيحلّه لك..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-24"
              />
              <Button className="w-full" disabled={!title || !description || submit.isPending} onClick={() => submit.mutate()}>
                {submit.isPending ? "جاري الإرسال..." : "إرسال"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">بيتحمّل...</p>
      ) : !requests?.length ? (
        <p className="text-sm text-muted-foreground">لسه مفيش اقتراحات — كن أول واحد يقترح حاجة.</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-start gap-3 py-4">
                <button
                  onClick={() => vote.mutate(r.id)}
                  className={`flex shrink-0 flex-col items-center rounded-xl border px-3 py-1.5 text-xs transition-colors ${
                    r.hasVoted ? "border-primary bg-primary/10 text-primary" : "border-muted-foreground/20 hover:border-muted-foreground/40"
                  }`}
                >
                  <ArrowBigUp className="size-4" />
                  {r.voteCount}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.title}</span>
                    <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
