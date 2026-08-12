import { NextResponse } from "next/server";

import { requireWorkspace } from "@/features/authentication/services/get-current-workspace";
import { getOAuthProvider, slugToProviderName } from "@/lib/oauth/oauth-registry";
import { oauthConnectionRepository } from "@/lib/repositories/oauth-connection.repository";
import { encryptOAuthToken } from "@/lib/encryption";

function redirectWithMessage(request: Request, ok: boolean, message: string) {
  const url = new URL("/settings/developer/integrations", request.url);
  url.searchParams.set(ok ? "connected" : "error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: slug } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) return redirectWithMessage(request, false, "المستخدم لغى الربط");
  if (!code || !stateRaw) return redirectWithMessage(request, false, "استجابة ناقصة من المزوّد");

  const providerName = slugToProviderName(slug);
  const provider = providerName ? getOAuthProvider(providerName) : null;
  if (!providerName || !provider) return redirectWithMessage(request, false, "مزوّد غير مدعوم");

  let state: { workspaceId: string };
  try {
    state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
  } catch {
    return redirectWithMessage(request, false, "state غير صالح");
  }

  try {
    // The state says which workspace STARTED this — but only the live
    // session decides which workspace it's allowed to attach a
    // connection to. They must match, or this callback is rejected.
    const { user, workspace } = await requireWorkspace();
    if (workspace.id !== state.workspaceId) {
      return redirectWithMessage(request, false, "الجلسة الحالية مش نفس النشاط اللي بدأ الربط");
    }

    const tokens = await provider.exchangeCode(code);

    await oauthConnectionRepository.upsert(workspace.id, providerName, {
      accessTokenEncrypted: encryptOAuthToken(tokens.accessToken),
      refreshTokenEncrypted: tokens.refreshToken ? encryptOAuthToken(tokens.refreshToken) : null,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      connectedByUserId: user.id,
    });

    return redirectWithMessage(request, true, provider.name);
  } catch (error) {
    console.error(`OAuth callback failed for ${slug}:`, error);
    return redirectWithMessage(request, false, "تعذّر إتمام الربط");
  }
}
