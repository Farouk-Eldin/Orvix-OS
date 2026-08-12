import { workflowRepository } from "@/lib/repositories/workflow.repository";

export const workflowVersionService = {
  async publish(workflowId: string, name: string, publishedByUserId: string) {
    await workflowRepository.createVersionSnapshot(workflowId, name, publishedByUserId);
    return workflowRepository.setStatus(workflowId, "PUBLISHED");
  },

  listVersions(workflowId: string) {
    return workflowRepository.listVersions(workflowId);
  },

  /**
   * Restoring version N doesn't just reactivate it — it becomes a brand
   * new version on top (same rule prompt rollback already follows).
   * History only ever grows.
   */
  async rollback(workflowId: string, versionId: string, userId: string) {
    const version = await workflowRepository.getVersion(versionId, workflowId);
    if (!version) throw new Error("النسخة دي مش موجودة");

    const nodesSnapshot = version.nodesSnapshot as unknown as {
      localId: string;
      type: string;
      config: unknown;
      positionX: number;
      positionY: number;
    }[];
    const edgesSnapshot = version.edgesSnapshot as unknown as { from: string; to: string; branch: string | null }[];

    await workflowRepository.replaceGraph(workflowId, { nodes: nodesSnapshot, edges: edgesSnapshot });
    return this.publish(workflowId, version.name, userId);
  },
};
