import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "@/lib/channels/whatsapp-client";
import { sendMessengerMessage } from "@/lib/channels/messenger-client";
import { sendInstagramMessage } from "@/lib/channels/instagram-client";
import { decryptChannelSecret } from "@/lib/encryption";

export interface OutboundMessageTarget {
  workspaceId: string;
  channel: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM";
  /** phone for WhatsApp, PSID for Messenger, IGSID for Instagram */
  externalCustomerId: string;
}

export async function sendChannelMessage(target: OutboundMessageTarget, text: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: target.workspaceId },
    include: { whatsappAccount: true, facebookPage: true, instagramAccount: true },
  });
  if (!workspace) return { success: false as const, error: "Workspace not found" };

  if (target.channel === "WHATSAPP") {
    if (!workspace.whatsappAccount) return { success: false as const, error: "WhatsApp غير متصل" };
    return sendWhatsAppMessage({
      phoneNumberId: workspace.whatsappAccount.phoneNumberId,
      accessToken: decryptChannelSecret(workspace.whatsappAccount.accessToken),
      to: target.externalCustomerId,
      body: text,
    });
  }

  if (target.channel === "FACEBOOK") {
    if (!workspace.facebookPage) return { success: false as const, error: "فيسبوك غير متصل" };
    return sendMessengerMessage({
      pageAccessToken: decryptChannelSecret(workspace.facebookPage.accessToken),
      recipientPsid: target.externalCustomerId,
      body: text,
    });
  }

  if (!workspace.instagramAccount) return { success: false as const, error: "إنستجرام غير متصل" };
  return sendInstagramMessage({
    instagramBusinessId: workspace.instagramAccount.instagramId,
    accessToken: decryptChannelSecret(workspace.instagramAccount.accessToken),
    recipientId: target.externalCustomerId,
    body: text,
  });
}
