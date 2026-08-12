// PROPOSAL — target path: features/onboarding/services/checklist.service.ts (new file)
//
// Deliberately NOT a stored progress table. Every step below is
// "has this workspace ever done X" — answerable by querying the table
// that already records X. A stored OnboardingProgress row would need
// updating from every place that could complete a step (channel
// connect, file upload, first booking, first workflow — four different
// features) and WILL eventually drift. Derived-on-read can't drift,
// and this is cheap: five small existence checks, not five full scans.
//
// Note on the knowledge check: KnowledgeFile has no direct workspaceId
// — it's reached through KnowledgeBase.workspaceId. Confirmed against
// the real schema before writing this, not assumed.

import { prisma } from "@/lib/prisma";

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

export const checklistService = {
  async getProgress(workspaceId: string) {
    const [hasKnowledge, hasWhatsApp, hasFacebook, hasBooking, hasWorkflow] = await Promise.all([
      prisma.knowledgeFile.findFirst({ where: { knowledgeBase: { workspaceId } } }),
      prisma.whatsAppAccount.findUnique({ where: { workspaceId } }),
      prisma.facebookPage.findUnique({ where: { workspaceId } }),
      prisma.booking.findFirst({ where: { workspaceId } }),
      prisma.workflow.findFirst({ where: { workspaceId } }),
    ]);

    const items: ChecklistItem[] = [
      { key: "knowledge", label: "ارفع أول ملف معرفة", done: !!hasKnowledge, href: "/dashboard/knowledge-base" },
      { key: "whatsapp", label: "وصّل واتساب", done: !!hasWhatsApp, href: "/dashboard/channels" },
      { key: "facebook", label: "وصّل فيسبوك", done: !!hasFacebook, href: "/dashboard/channels" },
      { key: "booking", label: "اعمل أول حجز", done: !!hasBooking, href: "/dashboard/appointments" },
      { key: "workflow", label: "اعمل أول Workflow", done: !!hasWorkflow, href: "/dashboard/workflows" },
    ];

    const completedCount = items.filter((i) => i.done).length;

    return {
      items,
      completedCount,
      totalCount: items.length,
      percent: Math.round((completedCount / items.length) * 100),
    };
  },
};
