"use client";

// PROPOSAL — target path: app/(app)/dashboard/workflows/[workflowId]/builder/page.tsx (new file)

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ReactFlowProvider } from "@xyflow/react";

import { WorkflowCanvas } from "@/features/workflow-builder/components/workflow-canvas";
import { VersionHistoryPanel } from "@/features/workflow-builder/components/version-history-panel";
import { dbToFlow, type DbNode, type DbEdge } from "@/features/workflow-builder/lib/graph-convert";
import type { ApiResponse } from "@/types/api";

interface WorkflowDetail {
  workflow: {
    id: string;
    name: string;
    status: "DRAFT" | "PUBLISHED" | "DISABLED";
    nodes: DbNode[];
    edges: DbEdge[];
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

export default function WorkflowBuilderPage() {
  const { workflowId } = useParams<{ workflowId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: () => fetchJson<WorkflowDetail>(`/api/v1/workflows/${workflowId}`),
  });

  if (isLoading || !data) return <p className="p-4 text-sm text-muted-foreground">بيتحمّل...</p>;

  const { nodes, edges } = dbToFlow(data.workflow.nodes, data.workflow.edges);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{data.workflow.name}</h1>
        <VersionHistoryPanel workflowId={workflowId} />
      </div>
      <ReactFlowProvider>
        <WorkflowCanvas workflowId={workflowId} initialNodes={nodes} initialEdges={edges} status={data.workflow.status} />
      </ReactFlowProvider>
    </div>
  );
}
