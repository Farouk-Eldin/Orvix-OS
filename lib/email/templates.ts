import { siteConfig } from "@/config/site";

function wrapper(bodyHtml: string) {
  return `
  <div dir="rtl" lang="ar" style="font-family: Tahoma, Arial, sans-serif; background:#f8f8fb; padding:32px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:24px;padding:32px;border:1px solid #eee;">
      <div style="font-weight:bold;font-size:18px;margin-bottom:16px;">${siteConfig.nameAr}</div>
      ${bodyHtml}
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#888;">
        ${siteConfig.nameAr} — ${new Date().getFullYear()}
      </div>
    </div>
  </div>`;
}

export const emailTemplates = {
  welcome: (businessName: string) =>
    wrapper(
      `<p>أهلاً بيك في ${siteConfig.nameAr}! 🎉</p><p>نشاطك "<strong>${businessName}</strong>" جاهز، وعندك 10 رسائل مجانية عشان تجرّب المساعد الذكي.</p>`
    ),
  paymentSuccess: (amount: number) =>
    wrapper(`<p>تم الدفع بنجاح ✅</p><p>المبلغ: <strong>${amount} ج.م</strong></p><p>اشتراكك اتفعّل وكل الميزات متاحة دلوقتي.</p>`),
  paymentFailed: () =>
    wrapper(`<p>للأسف عملية الدفع مكملتش ⚠️</p><p>تقدر تحاول تاني في أي وقت من صفحة الاشتراك.</p>`),
  subscriptionExpiring: (daysLeft: number) =>
    wrapper(`<p>اشتراكك هينتهي بعد <strong>${daysLeft} يوم</strong>.</p><p>جدّده دلوقتي عشان مايتوقفش المساعد الذكي عن الرد.</p>`),
  subscriptionExpired: () =>
    wrapper(`<p>اشتراكك انتهى.</p><p>المساعد الذكي متوقف عن الرد حاليًا — جدّد الاشتراك عشان يرجع يشتغل.</p>`),
  knowledgeProcessingFinished: (fileName: string, chunksCreated: number) =>
    wrapper(`<p>خلّصنا معالجة "<strong>${fileName}</strong>" ✅</p><p>${chunksCreated} جزء بقى جاهز يستخدمه المساعد الذكي.</p>`),
  supportTicketCreatedForAdmin: (workspaceName: string, subject: string, ticketId: string) =>
    wrapper(
      `<p>تذكرة دعم جديدة من "<strong>${workspaceName}</strong>"</p><p>الموضوع: ${subject}</p><p style="margin-top:16px"><a href="${siteConfig.url}/admin/support/${ticketId}" style="color:#4f46e5">فتح التذكرة</a></p>`
    ),
  supportTicketReplyForWorkspace: (subject: string, ticketId: string) =>
    wrapper(
      `<p>فريق الدعم ردّ على تذكرتك ✅</p><p>الموضوع: ${subject}</p><p style="margin-top:16px"><a href="${siteConfig.url}/dashboard/support/${ticketId}" style="color:#4f46e5">فتح التذكرة</a></p>`
    ),
  broadcastAnnouncement: (title: string, body: string) => wrapper(`<h2 style="margin:0 0 8px">${title}</h2><p>${body}</p>`),
};
