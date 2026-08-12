# نشر Orvix OS على Railway

هذا الدليل مبني على فحص حقيقي للمشروع + التأكد من صيغة إعدادات Railway الحالية (بحثت فيها لحظة كتابة هذا الملف، مش من الذاكرة).

## المشروع محتاج خدمتين منفصلتين على Railway

Railway بيدعم أكتر من خدمة في نفس الـ Project، لكن كل خدمة محتاجة إعداداتها بنفسها — ملف `railway.json` واحد بيتحكم في خدمة واحدة بس.

### 1) خدمة الـ Web (Next.js)
- **Root Directory:** جذر المشروع
- **Config File Path:** `railway.json` (الافتراضي — موجود بالفعل)
- بيستخدم `Dockerfile` الحقيقي بتاعك، ومتأكد إنه متوافق (`output: "standalone"` في `next.config.mjs` موجود فعلاً، والـ Dockerfile بينسخ `node_modules/.prisma` يدويًا وده الحل الصحيح لمشكلة شائعة إن Next.js standalone مبيلقطش ملفات Prisma الثنائية تلقائيًا).
- الـ migrations بتتشغّل تلقائيًا قبل كل نشر (`preDeployCommand`) — مش داخل الـ build نفسه، عشان لو الـ build نجح لكن الـ migration فشل، Railway هيوقف النشر بدل ما يشغّل نسخة قديمة من الداتابيز مع كود جديد.

### 2) خدمة الـ Worker (BullMQ)
- **Root Directory:** نفس الريبو
- **Config File Path:** غيّرها من إعدادات الخدمة في Railway Dashboard لـ `railway-worker.json` (لازم تحددها يدويًا — الملف الافتراضي `railway.json` بيتقرا تلقائيًا بس للخدمة الأولى، أي خدمة تانية لازم تتقال لها صراحة تقرا ملف تاني).
- بيستخدم `Dockerfile.worker`.

## المتغيرات البيئية

انسخ كل المتغيرات من `.env.example` (موجود بالفعل ومحدّث) لكل الخدمتين. أهم حاجة:
- `DATABASE_URL` — لو ضفت PostgreSQL من داخل Railway نفسه، بيديك المتغير ده تلقائيًا، انسخه.
- `REDIS_URL` — لازم تضيف خدمة Redis من Railway (أو أي مزوّد تاني) عشان الـ Worker والـ Queue يشتغلوا.
- الباقي (Clerk, Supabase, Qdrant, Gemini/Grok, Paymob, Resend) — مفاتيحك الحقيقية.

## Health Check

`railway.json` مضبوط يستخدم `/api/v1/system/health` — ده endpoint حقيقي موجود بالفعل في المشروع (`app/api/v1/system/health/route.ts`)، بيرجّع 200 دايمًا لو التطبيق شغال (حتى لو خدمة فرعية زي Qdrant واطية بيرجع "DEGRADED" جوه الـ JSON نفسه، مش status code مختلف) — يعني ده بيتأكد إن الـ container شغال ومستجيب، مش إن كل حاجة متصلة.

## ⚠️ اللي لسه محتاج تأكيد حقيقي منك

كل اللي فوق ده مبني على فحص صحيح للكود وللصيغة الحالية بتاعت Railway — لكن **مقدرش أشغّل build أو deploy فعلي من هنا** (الشبكة في البيئة بتاعتي متقفولة تمامًا، جربتها فعليًا ورجعتلي 403). يعني لسه محتاج:

1. `npm install` فعلي (عندك أو جوه Railway نفسه وقت الـ build)
2. `npx prisma generate` + أول `prisma migrate dev` محلي عشان تتولد أول migration حقيقية من الـ schema الجديد
3. أول build حقيقي (`npm run build`) — مشروع بالحجم ده شبه مؤكد هيطلّع كام type error بسيطة محتاجة تصليح يدوي سريع، حتى لو الكود اتفحص syntax-wise وطلع سليم
