import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class ConversationRepository extends BaseRepository {
  findActiveForCustomer(customerId: string) {
    return this.db.conversation.findFirst({
      where: { customerId, status: { in: ["ACTIVE", "PENDING_INFO"] } },
      orderBy: { lastMessageAt: "desc" },
    });
  }

  create(data: Prisma.ConversationCreateInput) {
    return this.db.conversation.create({ data });
  }

  touch(id: string) {
    return this.db.conversation.update({ where: { id }, data: { lastMessageAt: new Date() } });
  }

  addMessage(data: Prisma.MessageCreateInput) {
    return this.db.message.create({ data });
  }

  history(conversationId: string, limit = 10) {
    return this.db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  listRecentForWorkspace(workspaceId: string, limit = 10) {
    return this.db.conversation.findMany({
      where: { workspaceId },
      orderBy: { lastMessageAt: "desc" },
      take: limit,
      include: { customer: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
  }

  async listForWorkspace(params: {
    workspaceId: string;
    search?: string;
    channel?: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM";
    page?: number;
    pageSize?: number;
  }) {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;

    const where: Prisma.ConversationWhereInput = {
      workspaceId: params.workspaceId,
      ...(params.channel ? { channel: params.channel } : {}),
      ...(params.search
        ? {
            customer: {
              OR: [
                { name: { contains: params.search, mode: "insensitive" } },
                { phone: { contains: params.search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const [conversations, total] = await Promise.all([
      this.db.conversation.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { customer: true, messages: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { messages: true } } },
      }),
      this.db.conversation.count({ where }),
    ]);

    return { conversations, total, page, pageSize };
  }

  getFullDetail(conversationId: string) {
    return this.db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
        messages: { orderBy: { createdAt: "asc" } },
        session: true,
      },
    });
  }

  countMessagesToday(workspaceId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.db.message.count({
      where: { conversation: { workspaceId }, createdAt: { gte: startOfDay } },
    });
  }

  countMessagesTotal(workspaceId: string) {
    return this.db.message.count({ where: { conversation: { workspaceId } } });
  }

  countAiReplies(workspaceId: string) {
    return this.db.message.count({ where: { conversation: { workspaceId }, aiGenerated: true } });
  }

  upsertSession(conversationId: string, workspaceId: string, summary: string, context: object) {
    return this.db.conversationSession.upsert({
      where: { conversationId },
      update: { summary, context },
      create: { conversationId, workspaceId, summary, context },
    });
  }
}

export const conversationRepository = new ConversationRepository();
