import type { ToolDefinition } from "@/lib/ai/providers/types";

export const CRM_ENRICHMENT_TOOLS: ToolDefinition[] = [
  {
    name: "add_customer_note",
    description:
      "يسجّل ملاحظة داخلية في ملف العميل لما المحادثة تكشف حاجة تستاهل إن فريق العمل ياخد باله منها (اهتمام واضح بخدمة معينة، شكوى، تفضيل متكرر). متستخدمهاش لتلخيص محادثة عادية من غير حاجة جديدة فعلاً.",
    parameters: {
      type: "object",
      properties: {
        note: { type: "string", description: "الملاحظة، جملة أو اتنين بالعربي، محددة ومفيدة لموظف بشري يقراها بعدين" },
      },
      required: ["note"],
    },
  },
];
