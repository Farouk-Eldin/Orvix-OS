// PROPOSAL — target path: lib/repositories/feature.repository.ts (new file)

import { BaseRepository } from "@/lib/repositories/base.repository";

export class FeatureRepository extends BaseRepository {
  // No row for this key = enabled. A registry entry is only ever needed
  // to turn something OFF, never to turn it on.
  async isEnabled(workspaceId: string, key: string): Promise<boolean> {
    const row = await this.db.workspaceFeature.findUnique({
      where: { workspaceId_key: { workspaceId, key } },
    });
    return row?.enabled ?? true;
  }

  async setEnabled(workspaceId: string, key: string, enabled: boolean) {
    return this.db.workspaceFeature.upsert({
      where: { workspaceId_key: { workspaceId, key } },
      create: { workspaceId, key, enabled },
      update: { enabled },
    });
  }

  listForWorkspace(workspaceId: string) {
    return this.db.workspaceFeature.findMany({ where: { workspaceId } });
  }
}

export const featureRepository = new FeatureRepository();
