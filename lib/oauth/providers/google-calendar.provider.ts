import type { OAuthProvider, OAuthTokenSet } from "@/lib/oauth/types";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} غير موجود في .env — لازم تسجّل تطبيق OAuth في Google Cloud Console الأول`);
  return value;
}

export const googleCalendarProvider: OAuthProvider = {
  name: "GOOGLE_CALENDAR",

  getAuthorizationUrl(state: string) {
    const params = new URLSearchParams({
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: SCOPE,
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<OAuthTokenSet> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
        client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
        redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`Google رفض تبديل الكود: ${await res.text()}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokenSet> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
        client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`Google رفض تجديد التوكن: ${await res.text()}`);
    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  },
};
