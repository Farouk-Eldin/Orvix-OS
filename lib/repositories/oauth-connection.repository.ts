import { BaseRepository } from "@/lib/repositories/base.repository";
import type { OAuthProviderName, Prisma } from "@prisma/client";

export class OAuthConnectionRepository extends BaseRepository {
  findForWorkspace(workspaceId: string, provider: OAuthProviderName) {
    return this.db.oAuthConnection.findUnique({ where: { workspaceId_provider: { workspaceId, provider } } });
  }

  listForWorkspace(workspaceId: string) {
    return this.db.oAuthConnection.findMany({ where: { workspaceId } });
  }

  upsert(
    workspaceId: string,
    provider: OAuthProviderName,
    data: Partial<Prisma.OAuthConnectionUncheckedCreateInput>
  ) {
    return this.db.oAuthConnection.upsert({
      where: { workspaceId_provider: { workspaceId, provider } },
      create: { workspaceId, provider, accessTokenEncrypted: "", ...data },
      update: data,
    });
  }

  delete(workspaceId: string, provider: OAuthProviderName) {
    return this.db.oAuthConnection
      .delete({ where: { workspaceId_provider: { workspaceId, provider } } })
      .catch(() => null);
  }
}

export const oauthConnectionRepository = new OAuthConnectionRepository();
