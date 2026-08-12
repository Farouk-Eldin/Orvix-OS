import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Orvix OS demo data...");

  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-store" },
    update: {},
    create: {
      name: "متجر ديمو",
      slug: "demo-store",
      country: "EG",
      businessType: "تجارة إلكترونية",
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@demo-store.test" },
    update: {},
    create: {
      clerkId: "demo_clerk_id_replace_after_phase_3",
      name: "مالك المتجر",
      email: "owner@demo-store.test",
      role: "OWNER",
      workspaceId: workspace.id,
      isSuperAdmin: true, // seeding is a dev-only operation — safe default for local /admin access
    },
  });

  await prisma.teamMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: owner.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: owner.id, role: "OWNER" },
  });

  await prisma.subscription.upsert({
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      plan: "FREE",
      status: "TRIALING",
      messagesLimit: 10,
      messagesUsed: 0,
    },
  });

  const existingEmployee = await prisma.aIEmployee.findFirst({
    where: { workspaceId: workspace.id, isDefault: true },
  });

  if (!existingEmployee) {
    await prisma.aIEmployee.create({
      data: {
        workspaceId: workspace.id,
        isDefault: true,
        name: "سارة",
        personality: "FRIENDLY",
        tone: "ودود ومحترف",
        language: "AUTO",
        replyLength: "DETAILED",
        emojiUsage: true,
        welcomeMessage: "أهلاً بيك في متجر ديمو! إزاي أقدر أساعدك النهاردة؟",
        businessDescription: "متجر إلكتروني ديمو لتجربة Orvix OS.",
        systemInstructions:
          "أنتِ سارة، موظفة خدمة عملاء افتراضية لمتجر ديمو. ردي بالعربية دايمًا إلا لو العميل كتب بالإنجليزي. استخدمي فقط المعلومات الموجودة في قاعدة المعرفة، ولو المعلومة مش موجودة اعتذري بأدب واطلبي من صاحب المتجر يضيفها.",
      },
    });
  }

  const kb = await prisma.knowledgeBase.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      workspaceId: workspace.id,
      title: "معلومات المتجر الأساسية",
      status: "EMPTY",
    },
  });

  await prisma.knowledgeFAQ.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      knowledgeBaseId: kb.id,
      question: "إيه مواعيد الشغل؟",
      answer: "احنا شغالين من السبت للخميس، من 10 الصبح لحد 10 بالليل.",
    },
  });

  const services: Array<"DATABASE" | "REDIS" | "QDRANT" | "STORAGE" | "GEMINI" | "GROK" | "QUEUE" | "WEBHOOKS"> = [
    "DATABASE",
    "REDIS",
    "QDRANT",
    "STORAGE",
    "GEMINI",
    "GROK",
    "QUEUE",
    "WEBHOOKS",
  ];
  for (const service of services) {
    await prisma.systemHealth.create({
      data: {
        service,
        status: service === "DATABASE" ? "ONLINE" : "OFFLINE",
        message: service === "DATABASE" ? null : "لم يتم الربط بعد",
      },
    });
  }

  console.log("✅ Done. Demo workspace:", workspace.slug);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
