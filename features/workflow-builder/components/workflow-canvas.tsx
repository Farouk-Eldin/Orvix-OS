"use client";

// PROPOSAL — target path: features/workflow-builder/components/workflow-canvas.tsx (new file)
// Requires: npm install @xyflow/react

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NodePalette } from "@/features/workflow-builder/components/node-palette";
import { NodeConfigPanel } from "@/features/workflow-builder/components/node-config-panel";
import { nodeTypes } from "@/features/workflow-builder/components/orvix-node";
import {
  flowToGraphPayload,
  isValidConnection,
  type FlowNode,
  type NodeType,
} from "@/features/workflow-builder/lib/graph-convert";
import type { ApiResponse } from "@/types/api";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body: ApiResponse<T> = await res.json();
  if (!body.success) throw new Error(body.message);
  return body.data;
}

interface Props {
  workflowId: string;
  initialNodes: FlowNode[];
  initialEdges: Edge[];
  status: "DRAFT" | "PUBLISHED" | "DISABLED";
}

let nextClientId = 1;

export function WorkflowCanvas({ workflowId, initialNodes, initialEdges, status }: Props) {
  const queryClient = useQueryClient();
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isDraft = status === "DRAFT";
  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const onNodesChange: OnNodesChange<FlowNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange: OnEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!isValidConnection(connection, nodes)) {
        toast.error("توصيلة غير مسموحة");
        return;
      }
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            label: connection.sourceHandle === "true" ? "أيوه" : connection.sourceHandle === "false" ? "لأ" : undefined,
          },
          eds
        )
      );
    },
    [nodes]
  );

  const addNode = useCallback((type: NodeType) => {
    const id = `new-${nextClientId++}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "orvixNode",
        position: { x: 200 + Math.random() * 100, y: 100 + nds.length * 90 },
        data: { nodeType: type, config: {} },
      },
    ]);
  }, []);

  const updateSelectedConfig = useCallback(
    (config: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, config } } : n)));
    },
    [selectedId]
  );

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const saveGraph = useMutation({
    mutationFn: () =>
      fetchJson(`/api/v1/workflows/${workflowId}/graph`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flowToGraphPayload(nodes, edges)),
      }),
    onSuccess: () => {
      toast.success("اتحفظت الرسمة");
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: (action: "start" | "stop") =>
      fetchJson(`/api/v1/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action === "start" ? "PUBLISHED" : "DRAFT" }),
      }),
    onSuccess: () => {
      toast.success(isDraft ? "اتنشر الـ Workflow" : "اترجع مسودة");
      queryClient.invalidateQueries({ queryKey: ["workflow", workflowId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-[calc(100vh-140px)] gap-3">
      <NodePalette onAdd={addNode} />

      <div className="relative flex-1 overflow-hidden rounded-2xl border">
        <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between">
          <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium backdrop-blur">
            {isDraft ? "مسودة" : "منشور"}
          </span>
          <div className="flex gap-2">
            {isDraft ? (
              <Button size="sm" onClick={() => saveGraph.mutate()} disabled={saveGraph.isPending}>
                <Save className="size-3.5" />
                حفظ
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => toggleStatus.mutate(isDraft ? "start" : "stop")}
              disabled={toggleStatus.isPending}
            >
              {isDraft ? <Play className="size-3.5" /> : <Square className="size-3.5" />}
              {isDraft ? "نشر" : "إيقاف النشر"}
            </Button>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={isDraft ? onNodesChange : undefined}
          onEdgesChange={isDraft ? onEdgesChange : undefined}
          onConnect={isDraft ? onConnect : undefined}
          onNodeClick={(_e, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          nodeTypes={nodeTypes}
          nodesDraggable={isDraft}
          nodesConnectable={isDraft}
          elementsSelectable={isDraft}
          fitView
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-background" />
        </ReactFlow>

        {!isDraft && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-background/90 p-2 text-center text-xs text-muted-foreground backdrop-blur">
            الـ Workflow منشور حاليًا — أوقف النشر عشان تعدّل الرسمة
          </div>
        )}
      </div>

      {selectedNode && isDraft && (
        <NodeConfigPanel node={selectedNode} onChange={updateSelectedConfig} onDelete={deleteSelected} />
      )}
    </div>
  );
}
