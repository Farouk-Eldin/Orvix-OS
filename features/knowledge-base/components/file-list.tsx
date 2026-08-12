"use client";

import { FileText, Trash2, RotateCcw, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeleteFile, useKnowledgeFiles, useReprocessFile } from "@/features/knowledge-base/hooks/use-knowledge-files";

const statusMap = {
  PENDING: { label: "في الانتظار", variant: "secondary" as const },
  PROCESSING: { label: "بتتجهّز", variant: "warning" as const },
  COMPLETED: { label: "جاهز", variant: "success" as const },
  FAILED: { label: "فشل", variant: "destructive" as const },
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList() {
  const { data: files, isLoading } = useKnowledgeFiles();
  const deleteFile = useDeleteFile();
  const reprocessFile = useReprocessFile();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/50" />
        ))}
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        لسه مفيش ملفات مرفوعة
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const status = statusMap[file.processingStatus];
        return (
          <div
            key={file.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur-xl"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {file.processingStatus === "PROCESSING" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{file.fileName}</div>
              <div className="text-xs text-muted-foreground">
                {formatSize(file.fileSize)} · {file._count.chunks} جزء
              </div>
            </div>
            <Badge variant={status.variant}>{status.label}</Badge>
            {file.processingStatus === "FAILED" && (
              <Button
                variant="ghost"
                size="icon"
                title="إعادة المحاولة"
                onClick={() => reprocessFile.mutate(file.id)}
                disabled={reprocessFile.isPending}
              >
                <RotateCcw className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteFile.mutate(file.id)}
              disabled={deleteFile.isPending}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
