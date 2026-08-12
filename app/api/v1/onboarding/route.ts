import { getCurrentUser, UnauthorizedError } from "@/features/authentication/services/get-current-workspace";
import { workspaceRepository } from "@/lib/repositories/workspace.repository";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/events/event-bus";
import { onboardingSchema } from "@/features/onboarding/schemas/onboarding.schema";
import { siteConfig } from "@/config/site";
import { apiSuccess, apiError, apiErrors } from "@/lib/api-response";

// PROPOSAL — target path: app/api/v1/onboarding/route.ts (replaces existing file)
// SUPERSEDES the referral-only version from earlier this session — this
// one also removes the "already has a workspace" hard block, so the
// same endpoint now handles both first-time onboarding AND creating an
// additional workspace (Enterprise "Multi Workspace"). Byte-identical
// to the original otherwise, aside from:
//   1. onboardingSchema needs `.extend({ referralCode: z.string().optional() })`
//      in features/onboarding/schemas/onboarding.schema.ts (not shown —
//      haven't seen that file's exact current shape).
//   2. The old 409 block is gone; a TeamMember row + subscription get
//      created for every workspace, referral or not.
//   3. user.workspaceId is treated as "currently active workspace" and
//      always points at the newest one after this call — see
//      /api/v1/workspaces/switch for changing it back without creating
//      anything new.

const REFERRAL_TRIAL_DAYS = 30;

function slugify(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^\u0621-\u064Aa-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return base || "workspace";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return apiErrors.unauthorized();

    const json = await request.json();
    const parsed = onboardingSchema.safeParse(json);
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).filter(
          (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0
        )
      );
      return apiError("في بيانات ناقصة أو غير صحيحة", fieldErrors, 400);
    }

    const { businessName, businessType, country, logoUrl, supportLanguage, timezone, referralCode } = parsed.data;

    let marketer = null;
    if (referralCode) {
      marketer = await prisma.marketer.findFirst({ where: { referralCode, status: "ACTIVE" } });
      if (!marketer) {
        return apiError("كود الدعوة غير صحيح أو غير فعّال", [], 400);
      }
    }

    let slug = slugify(businessName);
    let attempt = 0;
    while (await workspaceRepository.isSlugTaken(slug)) {
      attempt += 1;
      slug = `${slugify(businessName)}-${attempt}`;
    }

    const trialEndsAt = marketer ? new Date(Date.now() + REFERRAL_TRIAL_DAYS * 24 * 60 * 60 * 1000) : null;

    const workspace = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: businessName, slug, country, businessType, logo: logoUrl || null },
      });

      // Always creates a TeamMember row (the real membership record).
      // user.workspaceId is a convenience pointer to "currently active" —
      // updated here too so this endpoint's behavior for a first-time
      // signup is identical to before.
      await tx.user.update({
        where: { id: user.id },
        data: { workspaceId: workspace.id, role: "OWNER", timezone },
      });

      await tx.teamMember.create({
        data: { workspaceId: workspace.id, userId: user.id, role: "OWNER" },
      });

      await tx.subscription.create({
        data: trialEndsAt
          ? { workspaceId: workspace.id, plan: "FREE", status: "TRIALING", trialEndsAt }
          : {
              workspaceId: workspace.id,
              plan: "FREE",
              status: "TRIALING",
              messagesLimit: siteConfig.freeTrial.messages,
              messagesUsed: 0,
            },
      });

      if (marketer) {
        await tx.referral.create({
          data: { marketerId: marketer.id, workspaceId: workspace.id, trialEndsAt: trialEndsAt! },
        });
      }

      await tx.aIEmployee.create({
        data: {
          workspaceId: workspace.id,
          name: "المساعد الذكي",
          personality: "PROFESSIONAL",
          language: supportLanguage,
          welcomeMessage: `أهلاً بيك في ${businessName}! إزاي أقدر أساعدك؟`,
          businessDescription: businessName,
          systemInstructions: `أنت مساعد خدمة عملاء لدى ${businessName}. رد فقط بالاعتماد على قاعدة المعرفة المتاحة، ولو المعلومة مش موجودة اعتذر بأدب واطلب من صاحب النشاط إضافتها.`,
        },
      });

      await tx.knowledgeBase.create({
        data: { workspaceId: workspace.id, title: "قاعدة المعرفة الرئيسية", status: "EMPTY" },
      });

      return workspace;
    });

    eventBus.emitEvent("WorkspaceCreated", { workspaceId: workspace.id, ownerId: user.id, businessType });
    if (!user.workspaceId) {
      eventBus.emitEvent("UserRegistered", { userId: user.id, workspaceId: workspace.id, email: user.email });
    }

    return apiSuccess(
      { workspaceId: workspace.id, slug: workspace.slug, referred: !!marketer },
      marketer ? "تم إنشاء النشاط — عندك ٣٠ يوم تجربة مجانية بدون حد للرسائل" : "تم إنشاء النشاط بنجاح"
    );
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    console.error("POST /api/v1/onboarding failed:", error);
    return apiErrors.serverError();
  }
}
