import { prisma } from "@/lib/prisma";

export const workspaceAdminService = {
  async list(params: { search?: string; page?: number; pageSize?: number }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { slug: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          subscription: true,
          _count: { select: { customers: true, conversations: true } },
        },
      }),
      prisma.workspace.count({ where }),
    ]);

    return { workspaces, total, page, pageSize };
  },

  async getDetail(workspaceId: string) {
    return prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        subscription: true,
        whatsappAccount: true,
        facebookPage: true,
        instagramAccount: true,
        paymentLogs: { orderBy: { createdAt: "desc" }, take: 10 },
        _count: { select: { customers: true, conversations: true } },
      },
    });
  },

  suspend(workspaceId: string) {
    return prisma.workspace.update({ where: { id: workspaceId }, data: { suspended: true } });
  },

  activate(workspaceId: string) {
    return prisma.workspace.update({ where: { id: workspaceId }, data: { suspended: false } });
  },

  delete(workspaceId: string) {
    // Schema cascades handle the rest — see prisma/schema.prisma relations.
    return prisma.workspace.delete({ where: { id: workspaceId } });
  },
};
