"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface HealthService {
  service: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  latencyMs: number | null;
  message: string | null;
}

const statusIcon = {
  ONLINE: <CheckCircle2 className="size-4 text-emerald-400" />,
  DEGRADED: <AlertTriangle className="size-4 text-amber-400" />,
  OFFLINE: <XCircle className="size-4 text-red-400" />,
};

export default function AdminSystemPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "system-health"],
    queryFn: async () => {
      const res = await fetch("/api/v1/system/health");
      const body = await res.json();
      return body.data as { overall: string; services: HealthService[]; checkedAt: string };
    },
    refetchInterval: 15000,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">حالة النظام</h1>

      <div className="rounded-2xl border border-white/10 divide-y divide-white/10">
        {isLoading || !data ? (
          <div className="p-6 text-center text-white/40">بيتحمّل...</div>
        ) : (
          data.services.map((s) => (
            <div key={s.service} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                {statusIcon[s.status]}
                <span className="font-medium">{s.service}</span>
              </div>
              <div className="text-end text-xs text-white/50">
                {s.latencyMs != null && <div>{s.latencyMs} مللي ثانية</div>}
                {s.message && <div>{s.message}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
