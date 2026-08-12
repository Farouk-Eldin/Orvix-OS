"use client";

import { useQuery } from "@tanstack/react-query";
import { HardDrive } from "lucide-react";

import type { ApiResponse } from "@/types/api";

interface StorageOverview {
  totalBytes: number;
  totalFiles: number;
  topWorkspaces: { workspaceId: string; workspaceName: string; bytes: number; fileCount: number }[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 ميجابايت";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} ميجابايت`;
  return `${(mb / 1024).toFixed(2)} جيجابايت`;
}

export default function AdminStoragePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "storage"],
    queryFn: () => fetchJson<StorageOverview>("/api/admin/storage"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">التخزين</h1>

      {isLoading || !data ? (
        <p className="text-sm text-white/50">بيتحمّل...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-white/50">
                <HardDrive className="size-4" />
                <span className="text-sm">إجمالي مساحة قاعدة المعرفة</span>
              </div>
              <div className="mt-1 text-2xl font-bold">{formatBytes(data.totalBytes)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/50">إجمالي الملفات</div>
              <div className="mt-1 text-2xl font-bold">{data.totalFiles}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/50">
                <tr>
                  <th className="p-3 text-start font-medium">النشاط</th>
                  <th className="p-3 text-start font-medium">الملفات</th>
                  <th className="p-3 text-start font-medium">المساحة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {data.topWorkspaces.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-white/50">
                      لسه مفيش ملفات مرفوعة
                    </td>
                  </tr>
                ) : (
                  data.topWorkspaces.map((w) => (
                    <tr key={w.workspaceId}>
                      <td className="p-3">{w.workspaceName}</td>
                      <td className="p-3 text-white/70">{w.fileCount}</td>
                      <td className="p-3 text-white/70">{formatBytes(w.bytes)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
