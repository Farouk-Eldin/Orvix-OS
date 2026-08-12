const GRAPH_API_VERSION = "v23.0";

/**
 * Sends a plain text reply. Only valid within the 24-hour customer service
 * window — since this is always used to reply to a message that just
 * arrived, we're always inside that window. Outbound-initiated marketing
 * (outside the window) would need an approved message Template instead,
 * which is out of scope for an AI support responder.
 */
export async function sendWhatsAppMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${params.phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: params.to,
        type: "text",
        text: { preview_url: false, body: params.body },
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.error?.message ?? `HTTP ${res.status}` };
    }
    return { success: true, messageId: json.messages?.[0]?.id ?? "" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "فشل إرسال رسالة واتساب" };
  }
}
