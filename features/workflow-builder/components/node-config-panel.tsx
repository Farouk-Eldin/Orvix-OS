"use client";

// PROPOSAL — target path: features/workflow-builder/components/node-config-panel.tsx (new file)
//
// Field sets below match runNode()'s actual cases in lib/workflow/engine.ts
// field-for-field — e.g. ACTION_CREATE_BOOKING reads cfg.customerId,
// cfg.serviceId, cfg.resourceId, cfg.startAtIso, so those are exactly
// the fields offered here. Getting this out of sync with the engine
// would mean the canvas builds configs the engine can't actually use.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FlowNode, NodeType } from "@/features/workflow-builder/lib/graph-convert";
import { NODE_META } from "@/features/workflow-builder/components/orvix-node";

interface Props {
  node: FlowNode;
  onChange: (config: Record<string, unknown>) => void;
  onDelete: () => void;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-8 text-xs" />
    </div>
  );
}

const TEMPLATE_HINT = "استخدم {{trigger.customerId}} أو {{node_xxx.bookingId}} للإشارة لبيانات من خطوة سابقة";

export function NodeConfigPanel({ node, onChange, onDelete }: Props) {
  const type = node.data.nodeType as NodeType;
  const cfg = node.data.config;
  const set = (key: string, value: string) => onChange({ ...cfg, [key]: value });

  return (
    <div className="w-64 shrink-0 space-y-3 overflow-y-auto rounded-2xl border bg-background/80 p-3 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{NODE_META[type].label}</span>
        <button onClick={onDelete} className="text-xs text-destructive hover:underline">
          حذف
        </button>
      </div>

      {type === "ACTION_CREATE_BOOKING" && (
        <>
          <Field
            label="معرف العميل"
            value={String(cfg.customerId ?? "")}
            onChange={(v) => set("customerId", v)}
            placeholder="{{trigger.customerId}}"
          />
          <Field label="معرف الخدمة" value={String(cfg.serviceId ?? "")} onChange={(v) => set("serviceId", v)} />
          <Field label="معرف المورد (اختياري)" value={String(cfg.resourceId ?? "")} onChange={(v) => set("resourceId", v)} />
          <Field label="الوقت (ISO)" value={String(cfg.startAtIso ?? "")} onChange={(v) => set("startAtIso", v)} />
        </>
      )}

      {type === "ACTION_ADD_CRM_NOTE" && (
        <>
          <Field
            label="معرف العميل"
            value={String(cfg.customerId ?? "")}
            onChange={(v) => set("customerId", v)}
            placeholder="{{trigger.customerId}}"
          />
          <div className="space-y-1">
            <Label className="text-xs">نص الملاحظة</Label>
            <Textarea value={String(cfg.content ?? "")} onChange={(e) => set("content", e.target.value)} className="min-h-16 text-xs" />
          </div>
        </>
      )}

      {type === "ACTION_SEND_NOTIFICATION" && (
        <>
          <Field label="العنوان" value={String(cfg.title ?? "")} onChange={(v) => set("title", v)} />
          <div className="space-y-1">
            <Label className="text-xs">الرسالة</Label>
            <Textarea value={String(cfg.message ?? "")} onChange={(e) => set("message", e.target.value)} className="min-h-16 text-xs" />
          </div>
        </>
      )}

      {type === "CONDITION_IF" && (
        <>
          <Field label="الحقل" value={String(cfg.field ?? "")} onChange={(v) => set("field", v)} placeholder="trigger.status" />
          <Field label="القيمة المطلوبة" value={String(cfg.value ?? "")} onChange={(v) => set("value", v)} placeholder="CONFIRMED" />
        </>
      )}

      {type === "AI_GENERATE_REPLY" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">تعليمات النظام (اختياري)</Label>
            <Textarea
              value={String(cfg.systemPrompt ?? "")}
              onChange={(e) => set("systemPrompt", e.target.value)}
              className="min-h-14 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">الطلب</Label>
            <Textarea value={String(cfg.prompt ?? "")} onChange={(e) => set("prompt", e.target.value)} className="min-h-16 text-xs" />
          </div>
        </>
      )}

      {type.startsWith("TRIGGER_") && <p className="text-xs text-muted-foreground">نقطة البداية — من غير إعدادات إضافية.</p>}

      {(type === "ACTION_CREATE_BOOKING" || type === "ACTION_ADD_CRM_NOTE" || type === "CONDITION_IF") && (
        <p className="text-[10px] leading-relaxed text-muted-foreground">{TEMPLATE_HINT}</p>
      )}
    </div>
  );
}
