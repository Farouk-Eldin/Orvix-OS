import { MessageCircle, Facebook, Instagram, Radio } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChannelConnectCard } from "@/features/channels/components/channel-connect-card";
import { siteConfig } from "@/config/site";

export default function ChannelsPage() {
  const base = siteConfig.url;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Radio className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">القنوات</h1>
          <p className="text-sm text-muted-foreground">وصّل حساباتك عشان المساعد الذكي يرد تلقائيًا</p>
        </div>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="text-sm">روابط الـ Webhook (سجّلها في Meta App Dashboard)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs">
          <div className="rounded-xl bg-muted/50 p-3">{base}/api/webhooks/whatsapp</div>
          <div className="rounded-xl bg-muted/50 p-3">{base}/api/webhooks/messenger</div>
          <div className="rounded-xl bg-muted/50 p-3">{base}/api/webhooks/instagram</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ChannelConnectCard
          channel="whatsapp"
          title="واتساب"
          description="غير متصل لسه"
          icon={MessageCircle}
          helpUrl="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
          fields={[
            { name: "phoneNumber", label: "الرقم", placeholder: "+201234567890" },
            { name: "phoneNumberId", label: "Phone Number ID" },
            { name: "businessAccountId", label: "WhatsApp Business Account ID" },
            { name: "accessToken", label: "Access Token" },
          ]}
        />
        <ChannelConnectCard
          channel="facebook"
          title="فيسبوك"
          description="غير متصل لسه"
          icon={Facebook}
          helpUrl="https://developers.facebook.com/docs/messenger-platform/get-started"
          fields={[
            { name: "pageId", label: "Page ID" },
            { name: "pageName", label: "اسم الصفحة" },
            { name: "accessToken", label: "Page Access Token" },
          ]}
        />
        <ChannelConnectCard
          channel="instagram"
          title="إنستجرام"
          description="غير متصل لسه"
          icon={Instagram}
          helpUrl="https://developers.facebook.com/docs/messenger-platform/instagram"
          fields={[
            { name: "instagramId", label: "Instagram Business ID" },
            { name: "username", label: "اسم المستخدم" },
            { name: "accessToken", label: "Access Token" },
          ]}
        />
      </div>
    </div>
  );
}
