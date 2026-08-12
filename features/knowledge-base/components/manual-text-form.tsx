"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useManualEntry } from "@/features/knowledge-base/hooks/use-knowledge-files";

const manualFormSchema = z.object({
  title: z.string().min(2, "العنوان قصير جدًا"),
  content: z.string().min(20, "النص قصير جدًا عشان يبقى مفيد"),
});
type ManualFormValues = z.infer<typeof manualFormSchema>;

export function ManualTextForm() {
  const manualEntry = useManualEntry();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualFormValues>({ resolver: zodResolver(manualFormSchema) });

  const onSubmit = (values: ManualFormValues) => {
    manualEntry.mutate(values, { onSuccess: () => reset() });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="title">العنوان</Label>
        <Input id="title" placeholder="مثال: سياسة الاسترجاع" {...register("title")} aria-invalid={!!errors.title} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="content">النص</Label>
        <Textarea
          id="content"
          rows={8}
          placeholder="اكتب أي معلومة عايز الذكاء الاصطناعي يعرفها عن نشاطك..."
          {...register("content")}
          aria-invalid={!!errors.content}
        />
        {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
      </div>
      <Button type="submit" disabled={manualEntry.isPending}>
        {manualEntry.isPending && <Loader2 className="size-4 animate-spin" />}
        {manualEntry.isPending ? "بيتحفظ..." : "حفظ في قاعدة المعرفة"}
      </Button>
    </form>
  );
}
