import { NextResponse } from "next/server";

import { requireWorkspace, UnauthorizedError, NoWorkspaceError } from "@/features/authentication/services/get-current-workspace";
import { getOAuthProvider, slugToProviderName } from "@/lib/oauth/oauth-registry";
import { apiErrors } from "@/lib/api-response";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { workspace } = await requireWorkspace();
    const { provider: slug } = await params;

    const providerName = slugToProviderName(slug);
    const provider = providerName ? getOAuthProvider(providerName) : null;
    if (!providerName || !provider) return apiErrors.notFound("مزوّد الخدمة");

    // No signing here on purpose — the callback independently re-checks
    // that the logged-in session's workspace matches what's encoded, so
    // a forged state alone can't attach a connection to someone else's
    // workspace without also having a live session for it.
    const state = Buffer.from(JSON.stringify({ workspaceId: workspace.id, nonce: crypto.randomUUID() })).toString(
      "base64url"
    );

    try {
      return NextResponse.redirect(provider.getAuthorizationUrl(state));
    } catch (error) {
      return NextResponse.redirect(
        new URL(
          `/settings/developer/integrations?error=${encodeURIComponent(error instanceof Error ? error.message : "config")}`,
          request.url
        )
      );
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) return apiErrors.unauthorized();
    if (error instanceof NoWorkspaceError) return apiErrors.noWorkspace();
    return apiErrors.serverError();
  }
}
