import { providerRouter } from "@/lib/ai/providers/provider-router";

const NODE_TYPES = [
  "TRIGGER_MESSAGE_RECEIVED",
  "TRIGGER_BOOKING_CREATED",
  "TRIGGER_BOOKING_STATUS_CHANGED",
  "TRIGGER_MANUAL",
  "ACTION_CREATE_BOOKING",
  "ACTION_ADD_CRM_NOTE",
  "ACTION_SEND_NOTIFICATION",
  "CONDITION_IF",
  "AI_GENERATE_REPLY",
] as const;

export interface GeneratedWorkflowGraph {
  name: string;
  nodes: { localId: string; type: string; config: Record<string, unknown>; positionX: number; positionY: number }[];
  edges: { from: string; to: string; branch?: "true" | "false" | null }[];
}

const SYSTEM_PROMPT = `أنت مساعد بيحوّل وصف نصي بالعربي أو الإنجليزي لأتمتة (Workflow) لصيغة JSON فقط، من غير أي نص أو شرح قبله أو بعده، ومن غير markdown code fence.

أنواع الـ nodes المسموح استخدامها حصريًا (متستخدمش أي نوع تاني خالص):
${NODE_TYPES.join(", ")}

الصيغة المطلوبة بالظبط:
{
  "name": "اسم قصير ووصفي للأتمتة",
  "nodes": [{ "localId": "n1", "type": "TRIGGER_MESSAGE_RECEIVED", "config": {}, "positionX": 0, "positionY": 200 }],
  "edges": [{ "from": "n1", "to": "n2", "branch": null }]
}

قواعد إلزامية:
- أول node لازم يكون TRIGGER_MESSAGE_RECEIVED أو TRIGGER_BOOKING_CREATED أو TRIGGER_BOOKING_STATUS_CHANGED أو TRIGGER_MANUAL — حسب وصف المستخدم.
- كل node له positionX يزيد ٢٥٠ عن اللي قبله (٠، ٢٥٠، ٥٠٠...) وpositionY حوالي ٢٠٠ إلا لو فيه تفرّع.
- لو استخدمت CONDITION_IF، لازم يطلع منه edge بـ "branch": "true" وedge تاني بـ "branch": "false".
- لأي node تاني غير CONDITION_IF، خلي "branch": null.
- لو وصف المستخدم فيه خطوة مش موجودة في القائمة، قرّب لأقرب نوع متاح ومتخترعش نوع جديد.
- لازم كل الـ nodes متوصلة ببعض بترتيب منطقي — مفيش node معلّق من غير edges.`;

export const aiWorkflowBuilderService = {
  async generateFromDescription(workspaceId: string, description: string): Promise<GeneratedWorkflowGraph> {
    const { result } = await providerRouter.withFailover(workspaceId, (provider) =>
      provider.generateResponse({
        systemPrompt: SYSTEM_PROMPT,
        history: [],
        userMessage: description,
        temperature: 0.3,
        maxOutputTokens: 1200,
      })
    );

    const cleaned = result.content.replace(/```json|```/g, "").trim();

    let parsed: GeneratedWorkflowGraph;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("الذكاء الاصطناعي رجّع صيغة مش مفهومة — جرب توصف الأتمتة بشكل أوضح أو أبسط");
    }

    if (!parsed.nodes?.length) {
      throw new Error("محتاج وصف أكتر تفصيلًا عشان أقدر أبني الأتمتة");
    }

    // Never trust a model-generated type string blindly — anything
    // outside the real enum fails at the database layer anyway, better
    // to reject it here with a message that's actually useful.
    for (const node of parsed.nodes) {
      if (!NODE_TYPES.includes(node.type as (typeof NODE_TYPES)[number])) {
        throw new Error(`رجّع نوع خطوة مش مدعوم (${node.type}) — جرب توصف الأتمتة بشكل مختلف`);
      }
    }
    const firstNode = parsed.nodes[0];
    if (!firstNode || !firstNode.type.startsWith("TRIGGER_")) {
      throw new Error("أول خطوة في أي أتمتة لازم تكون Trigger — جرب توضّح إيه اللي بيبدأ الأتمتة");
    }

    return parsed;
  },
};
