// PROPOSAL — target path: lib/ai/tools/booking-tools.ts (new file)

import type { ToolDefinition } from "@/lib/ai/providers/types";

export const BOOKING_TOOLS: ToolDefinition[] = [
  {
    name: "check_availability",
    description: "يشيك هل معاد معين متاح للحجز قبل ما نأكده للعميل",
    parameters: {
      type: "object",
      properties: {
        serviceId: { type: "string", description: "معرف الخدمة المطلوبة" },
        resourceId: { type: "string", description: "معرف المورد (دكتور/طاولة/غرفة) لو محدد، اختياري" },
        startAtIso: { type: "string", description: "الوقت المطلوب بصيغة ISO 8601" },
      },
      required: ["serviceId", "startAtIso"],
    },
  },
  {
    name: "create_booking",
    description: "يحجز معاد فعليًا بعد ما العميل يأكد الوقت والخدمة",
    parameters: {
      type: "object",
      properties: {
        serviceId: { type: "string", description: "معرف الخدمة المطلوبة" },
        resourceId: { type: "string", description: "معرف المورد، اختياري" },
        startAtIso: { type: "string", description: "الوقت المؤكد بصيغة ISO 8601" },
      },
      required: ["serviceId", "startAtIso"],
    },
  },
];
