import type { ToolDefinition } from "@/lib/ai/providers/types";

export const TASK_TOOLS: ToolDefinition[] = [
  {
    name: "create_task",
    description:
      "يفتح مهمة متابعة لفريق العمل لما المحادثة تحتاج تدخّل بشري (اتصال، مراجعة، متابعة سعر) — مش لأي حاجة الـ AI نفسه قادر يتعامل معاها.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "وصف قصير للمهمة، مثلاً: تواصل مع العميل بخصوص عرض السعر" },
        dueAtIso: { type: "string", description: "موعد مقترح للمتابعة بصيغة ISO 8601، اختياري" },
      },
      required: ["title"],
    },
  },
];
