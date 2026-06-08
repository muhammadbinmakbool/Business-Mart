import { prisma } from "@/lib/prisma";

export class AdvanceRepository {
  static async getAll() {
    return prisma.intakeAdvance.findMany({
      include: {
        party: true,
        intakeTransaction: true,
        supplierInvoice: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  static async create(data) {
    return prisma.intakeAdvance.create({
      data
    });
  }

  static async getUnlinkedByPartyId(partyId) {
    return prisma.intakeAdvance.findMany({
      where: {
        partyId: parseInt(partyId),
        supplierInvoiceId: null
      },
      include: {
        intakeTransaction: true
      },
      orderBy: { createdAt: "desc" }
    });
  }
}
