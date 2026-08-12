"use client";

// PROPOSAL — target path: features/dashboard/components/workspace-switcher.tsx (new file)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, Check, Plus } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";

interface WorkspaceOption {
  id: string;
  name: string;
  logo: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  active: boolean;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export function WorkspaceSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces", "mine"],
    queryFn: () => fetchJson<WorkspaceOption[]>("/api/v1/workspaces/mine"),
  });

  const switchWorkspace = useMutation({
    mutationFn: (workspaceId: string) =>
      fetchJson("/api/v1/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      router.refresh();
      setOpen(false);
    },
  });

  const active = workspaces?.find((w) => w.active);

  // Only one workspace and it's the active one — nothing to switch
  // between, so don't show a dropdown that does nothing.
  if (workspaces && workspaces.length <= 1) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-start text-sm hover:bg-accent">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            {active?.name?.charAt(0) ?? "?"}
          </span>
          <span className="flex-1 truncate font-medium">{active?.name ?? "اختار نشاط"}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1.5" align="start">
        <div className="space-y-0.5">
          {(workspaces ?? []).map((w) => (
            <button
              key={w.id}
              onClick={() => !w.active && switchWorkspace.mutate(w.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-accent",
                switchWorkspace.isPending && "pointer-events-none opacity-50"
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                {w.name.charAt(0)}
              </span>
              <span className="flex-1 truncate text-start">{w.name}</span>
              {w.active && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </div>
        <div className="mt-1 border-t pt-1">
          <button
            onClick={() => router.push("/onboarding")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <Plus className="size-4" />
            نشاط جديد
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
