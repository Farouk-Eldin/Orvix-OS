"use client";

// PROPOSAL — target path: features/ai/hooks/use-employees.ts (new file)
// Additive alongside the existing use-ai-employee.ts (singular) hook —
// that one still powers the original settings form unchanged.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { ApiResponse } from "@/types/api";

export type EmployeeRole =
  | "GENERAL"
  | "SUPPORT"
  | "SALES"
  | "RECEPTIONIST"
  | "BOOKING"
  | "MARKETING"
  | "FINANCE"
  | "CRM"
  | "ANALYTICS"
  | "KNOWLEDGE_MANAGER";

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  isDefault: boolean;
  canManageBookings: boolean;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function useEmployees() {
  return useQuery({ queryKey: ["employees"], queryFn: () => fetchJson<Employee[]>("/api/v1/ai/employees") });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      role: EmployeeRole;
      welcomeMessage: string;
      businessDescription: string;
      systemInstructions: string;
      canManageBookings: boolean;
    }) =>
      fetchJson("/api/v1/ai/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تم إضافة الموظف");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, ...data }: { employeeId: string; isDefault?: boolean; canManageBookings?: boolean }) =>
      fetchJson(`/api/v1/ai/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("تم التحديث");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) => fetchJson(`/api/v1/ai/employees/${employeeId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم الحذف");
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
