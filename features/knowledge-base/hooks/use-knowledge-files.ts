"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

interface KnowledgeFile {
  id: string;
  fileName: string;
  fileType: "PDF" | "TXT" | "MANUAL";
  fileSize: number;
  processingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  _count: { chunks: number };
}

interface Faq {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useKnowledgeFiles() {
  return useQuery({
    queryKey: ["knowledge-files"],
    queryFn: () => fetchJson<KnowledgeFile[]>("/api/v1/knowledge/upload"),
    refetchInterval: (query) =>
      query.state.data?.some((f) => f.processingStatus === "PROCESSING" || f.processingStatus === "PENDING")
        ? 3000
        : false,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return fetchJson<{ fileId: string; chunksCreated: number }>("/api/v1/knowledge/upload", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (data) => {
      toast.success(`تم رفع الملف — ${data.chunksCreated} جزء جاهز للبحث`);
      queryClient.invalidateQueries({ queryKey: ["knowledge-files"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) => fetchJson(`/api/v1/knowledge/files/${fileId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("اتمسح الملف");
      queryClient.invalidateQueries({ queryKey: ["knowledge-files"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useReprocessFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) =>
      fetchJson<{ chunksCreated: number }>(`/api/v1/knowledge/files/${fileId}/reprocess`, { method: "POST" }),
    onSuccess: (data) => {
      toast.success(`اتعملت المعالجة تاني — ${data.chunksCreated} جزء`);
      queryClient.invalidateQueries({ queryKey: ["knowledge-files"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useManualEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { title: string; content: string }) =>
      fetchJson<{ fileId: string }>("/api/v1/knowledge/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("تمت إضافة المعلومة لقاعدة المعرفة");
      queryClient.invalidateQueries({ queryKey: ["knowledge-files"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useFaqs() {
  return useQuery({ queryKey: ["faqs"], queryFn: () => fetchJson<Faq[]>("/api/v1/knowledge/faq") });
}

export function useCreateFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { question: string; answer: string }) =>
      fetchJson<Faq>("/api/v1/knowledge/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast.success("تمت إضافة السؤال");
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-files"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteFaq() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (faqId: string) => fetchJson(`/api/v1/knowledge/faq/${faqId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("اتمسح السؤال");
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
