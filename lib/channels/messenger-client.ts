const GRAPH_API_VERSION = "v23.0";

export async function sendMessengerMessage(params: {
  pageAccessToken: string;
  recipientPsid: string;
  body: string;
}): Promise<{ success: true; messageId: string } | { success: false; error: string }> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messages?access_token=${encodeURIComponent(params.pageAccessToken)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: params.recipientPsid },
        messaging_type: "RESPONSE",
        message: { text: params.body },
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json?.error?.message ?? `HTTP ${res.status}` };
    }
    return { success: true, messageId: json.message_id ?? "" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "فشل إرسال رسالة ماسنجر" };
  }
}
