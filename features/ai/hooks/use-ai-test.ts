"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiResponse } from "@/types/api";

export interface AiTestResult {
  reply: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  usedProvider: string | null;
  retrievedChunks: { fileName: string; preview: string; score: number }[];
  tokens: { input: number; output: number };
  timing: { promptMs: number; totalMs: number };
}

export function useAiTest() {
  return useMutation({
    mutationFn: async (input: { message: string; history: { sender: "CUSTOMER" | "AI"; content: string }[] }) => {
      const res = await fetch("/api/v1/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body: ApiResponse<AiTestResult> = await res.json();
      if (!body.success) throw new Error(body.message);
      return body.data;
    },
  });
}
