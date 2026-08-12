"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTicket } from "@/features/support/hooks/use-tickets";
import { TICKET_PRIORITY_LABEL } from "@/features/support/lib/ticket-labels";

export function NewTicketDialog() {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const createTicket = useCreateTicket();

  const canSubmit = subject.trim().length >= 3 && body.trim().length >= 5;

  function handleSubmit() {
    createTicket.mutate(
      { subject: subject.trim(), body: body.trim(), priority },
      {
        onSuccess: () => {
          setOpen(false);
          setSubject("");
          setBody("");
          setPriority("MEDIUM");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          تذكرة جديدة
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تذكرة دعم جديدة</DialogTitle>
          <DialogDescription>هيردّ عليك فريق الدعم في أقرب وقت.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ticket-subject">الموضوع</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="مثلاً: مشكلة في ربط واتساب"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket-priority">الأولوية</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="ticket-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TICKET_PRIORITY_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket-body">تفاصيل المشكلة</Label>
            <Textarea
              id="ticket-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="اشرحلنا المشكلة بالتفصيل..."
              className="min-h-28"
            />
          </div>

          <Button className="w-full" disabled={!canSubmit || createTicket.isPending} onClick={handleSubmit}>
            {createTicket.isPending ? "جاري الإرسال..." : "إرسال التذكرة"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
