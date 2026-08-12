// PROPOSAL — target path: lib/repositories/lead.repository.ts (new file)

import { BaseRepository } from "@/lib/repositories/base.repository";
import type { Prisma } from "@prisma/client";

export class LeadRepository extends BaseRepository {
  listForWorkspace(workspaceId: string) {
    return this.db.lead.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: { assignedUser: { select: { id: true, name: true } } },
    });
  }

  findByIdInWorkspace(leadId: string, workspaceId: string) {
    return this.db.lead.findFirst({ where: { id: leadId, workspaceId } });
  }

  create(data: Prisma.LeadCreateInput) {
    return this.db.lead.create({ data });
  }

  update(leadId: string, data: Prisma.LeadUpdateInput) {
    return this.db.lead.update({ where: { id: leadId }, data });
  }

  // Won lead -> real Customer record, keeping the link both ways via
  // convertedCustomerId. Wrapped in a transaction so a lead can never end
  // up WON without a customer, or vice versa on a mid-way failure.
  async convertToCustomer(leadId: string, workspaceId: string) {
    return this.db.$transaction(async (tx) => {
      const lead = await tx.lead.findFirstOrThrow({ where: { id: leadId, workspaceId } });

      const customer = await tx.customer.create({
        data: {
          workspaceId,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          source: lead.source,
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: { stage: "WON", convertedCustomerId: customer.id },
      });

      return customer;
    });
  }
}

export const leadRepository = new LeadRepository();
