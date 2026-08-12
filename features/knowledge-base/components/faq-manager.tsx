"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, Plus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateFaq, useDeleteFaq, useFaqs } from "@/features/knowledge-base/hooks/use-knowledge-files";

const faqFormSchema = z.object({
  question: z.string().min(3, "السؤال قصير جدًا"),
  answer: z.string().min(1, "الإجابة مطلوبة"),
});
type FaqFormValues = z.infer<typeof faqFormSchema>;

export function FaqManager() {
  const { data: faqs, isLoading } = useFaqs();
  const createFaq = useCreateFaq();
  const deleteFaq = useDeleteFaq();
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FaqFormValues>({ resolver: zodResolver(faqFormSchema) });

  const onSubmit = (values: FaqFormValues) => {
    createFaq.mutate(values, {
      onSuccess: () => {
        reset();
        setShowForm(false);
      },
    });
  };

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="size-4" /> سؤال جديد
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3 rounded-2xl border border-border bg-card/60 p-4"
          noValidate
        >
          <div className="space-y-1.5">
            <Label htmlFor="question">السؤال</Label>
            <Input id="question" {...register("question")} aria-invalid={!!errors.question} />
            {errors.question && <p className="text-xs text-destructive">{errors.question.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="answer">الإجابة</Label>
            <Textarea id="answer" {...register("answer")} aria-invalid={!!errors.answer} />
            {errors.answer && <p className="text-xs text-destructive">{errors.answer.message}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={createFaq.isPending}>
              {createFaq.isPending && <Loader2 className="size-4 animate-spin" />}
              حفظ
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      ) : !faqs || faqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          لسه مفيش أسئلة شائعة مضافة
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{faq.question}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{faq.answer}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteFaq.mutate(faq.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
