"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUploadFile } from "@/features/knowledge-base/hooks/use-knowledge-files";

export function FileUploadDropzone() {
  const uploadFile = useUploadFile();
  const [queue, setQueue] = useState<string[]>([]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      for (const file of accepted) {
        setQueue((q) => [...q, file.name]);
        uploadFile.mutate(file, {
          onSettled: () => setQueue((q) => q.filter((n) => n !== file.name)),
        });
      }
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxSize: 50 * 1024 * 1024,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-muted/30 px-6 py-14 text-center transition-colors",
        isDragActive && "border-primary bg-primary/5"
      )}
    >
      <input {...getInputProps()} />
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UploadCloud className="size-6" />
      </span>
      <div>
        <p className="font-medium">اسحب وأفلت ملفاتك هنا، أو دوس للاختيار</p>
        <p className="mt-1 text-sm text-muted-foreground">PDF أو TXT — حتى 50 ميجا للملف</p>
      </div>

      {queue.length > 0 && (
        <div className="mt-2 w-full max-w-sm space-y-1.5 text-start">
          {queue.map((name) => (
            <div key={name} className="flex items-center gap-2 rounded-xl bg-background/70 px-3 py-2 text-xs">
              <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
              <span className="truncate">{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
