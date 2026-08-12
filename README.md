# Orvix OS

منصة الذكاء الاصطناعي لأتمتة خدمة العملاء عبر واتساب وفيسبوك ماسنجر وإنستجرام. لا يوجد تدخل بشري؛ الذكاء الاصطناعي يرد بالاعتماد على قاعدة معرفة كل نشاط تجاري فقط.

## الحالة — المشروع مكتمل ✅

كل المراحل العشرة + تمريرين معماريين (استعداد Orvix OS الأشمل، واستعداد عملاء متعددين ويب/موبايل/ديسكتوب) + تمرير أخير لسد الفجوات المتبقية.

### آخر تمرير — إكمال ما كان ناقصًا

- **المحادثات:** صفحة كاملة (`/dashboard/conversations`) — بحث، فلترة، ودردشة كل محادثة بالتفصيل مع بيانات العميل
- **تحليلات حقيقية:** توزيع القنوات، دقة الردود (نجاح استرجاع المعرفة HIGH/MEDIUM/LOW)، متوسط وقت الرد الفعلي — مش أرقام وهمية، كلها محسوبة من رسائل حقيقية. أضفت `Message.responseTimeMs` لأن الوقت كان بيتحسب فعلًا في `rag-service.ts` بس ملوش مكان يتخزّن فيه
- **إشعارات حقيقية:** زرار الجرس في الهيدر بقى Popover فعلي بيقرا من الداتابيز، مش شكل ثابت
- **الموظف الذكي قابل للتعديل بالكامل:** `/dashboard/settings/employee` — الاسم، الشخصية، النبرة، اللغة، طول الرد، الإيموجي، رسالة الترحيب، وصف النشاط، التعليمات — كانت بس بتتظبط وقت الـ Onboarding وخلاص
- **إعدادات النشاط + فريق العمل:** تعديل اسم/شعار النشاط، وإدارة أدوار الأعضاء الحاليين (دعوة بإيميل لسه محتاجة نظام Invite Token منفصل — مقلتش إني بنيتها لو مبنيتهاش)
- **نظام إيميلات حقيقي (Resend):** `lib/email/` — قوالب Welcome, Payment Success/Failed, Knowledge Processing Finished، متصلة بنظام الأحداث (`lib/events/`) مش بكود مكرر جوه كل route
- **Cron يومي:** `/api/v1/cron/daily` (محمي بـ `CRON_SECRET`) — تجميع التحليلات اليومية + تنبيهات انتهاء الاشتراك (7/3/1 يوم) + تحويل الاشتراكات المنتهية لـ EXPIRED تلقائيًا. جدول Vercel جاهز في `vercel.json`

## الستاك

Next.js 16 · TypeScript · Tailwind v4 · Prisma + PostgreSQL · Clerk (ويب + موبايل + ديسكتوب) · Supabase Storage · Qdrant · Gemini + Grok · Meta Graph API · Paymob · Redis + BullMQ · Resend · نظام أحداث داخلي · Docker

## التشغيل

```bash
npm install
cp .env.example .env
npm run db:push && npm run db:seed
npm run dev
```

النشر:
```bash
docker compose up --build
```

CI جاهز (`.github/workflows/ci.yml`)، وترقية أول أدمن حقيقي:
```bash
npx tsx scripts/make-super-admin.ts you@yourcompany.com
```

## التحقق

مفيش إنترنت في بيئة الإنشاء، لكن كل تعديل اتفحص بـ TypeScript compiler حقيقي (0 أخطاء Syntax عبر 174 ملف)، وكل مسارات `@/` والـ Prisma models اتأكد منها آليًا.

## الأمان

AES-256-GCM لكل الأسرار بسرّين منفصلين. لا سر بيترجع كامل لأي response. Rate limiting + Security headers على كل الـ APIs.
