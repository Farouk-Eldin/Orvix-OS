import { eventBus } from "@/lib/events/event-bus";
import { oauthConnectionRepository } from "@/lib/repositories/oauth-connection.repository";
import { bookingRepository } from "@/lib/repositories/booking.repository";
import { getOAuthProvider } from "@/lib/oauth/oauth-registry";
import { decryptOAuthToken, encryptOAuthToken } from "@/lib/encryption";

async function getValidAccessToken(workspaceId: string): Promise<string | null> {
  const connection = await oauthConnectionRepository.findForWorkspace(workspaceId, "GOOGLE_CALENDAR");
  if (!connection) return null;

  const isExpiringSoon = connection.expiresAt && connection.expiresAt.getTime() < Date.now() + 60_000;
  if (!isExpiringSoon) return decryptOAuthToken(connection.accessTokenEncrypted);

  if (!connection.refreshTokenEncrypted) return null;
  const provider = getOAuthProvider("GOOGLE_CALENDAR");
  if (!provider) return null;

  const refreshed = await provider.refreshAccessToken(decryptOAuthToken(connection.refreshTokenEncrypted));
  await oauthConnectionRepository.upsert(workspaceId, "GOOGLE_CALENDAR", {
    accessTokenEncrypted: encryptOAuthToken(refreshed.accessToken),
    expiresAt: refreshed.expiresAt,
  });
  return refreshed.accessToken;
}

export function registerOAuthIntegrationListeners() {
  eventBus.onEvent("AppointmentCreated", async ({ workspaceId, appointmentId }) => {
    try {
      const accessToken = await getValidAccessToken(workspaceId);
      if (!accessToken) return; // not connected — this integration is optional, silently skip

      const booking = await bookingRepository.findByIdWithDetails(appointmentId);
      if (!booking) return;

      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `${booking.service?.name ?? "موعد"} — ${booking.customer?.name ?? "عميل"}`,
          description: booking.notes ?? undefined,
          start: { dateTime: booking.startAt.toISOString() },
          end: { dateTime: booking.endAt.toISOString() },
        }),
      });

      if (!res.ok) {
        console.error(`[oauth-integrations] Google Calendar rejected the event: ${await res.text()}`);
      }
    } catch (error) {
      // A calendar sync failure must never touch the booking itself —
      // the booking already exists and is already confirmed by this point.
      console.error(`[oauth-integrations] Google Calendar sync failed for booking ${appointmentId}:`, error);
    }
  });
}
