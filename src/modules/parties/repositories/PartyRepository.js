import { prisma } from "@/lib/prisma";

export class PartyRepository {
  static async getAll() {
    return prisma.party.findMany({
      orderBy: { name: "asc" },
    });
  }

  static async getById(id) {
    return prisma.party.findUnique({
      where: { id: parseInt(id) },
    });
  }

  static async create(data) {
    return prisma.party.create({
      data,
    });
  }

  static async update(id, data) {
    return prisma.party.update({
      where: { id: parseInt(id) },
      data,
    });
  }

  static async toggleStatus(id, isActive) {
    return prisma.party.update({
      where: { id: parseInt(id) },
      data: { isActive },
    });
  }
  
  static async delete(id) {
    // Delete related transactional data for practical cleanup
    await prisma.intakeAdvance.deleteMany({ where: { partyId: parseInt(id) } });
    await prisma.intakeTransaction.deleteMany({ where: { partyId: parseInt(id) } });
    
    return prisma.party.delete({
      where: { id: parseInt(id) },
    });
  }

  static async getPartyProfileData(id) {
    const pId = parseInt(id);
    return prisma.party.findUnique({
      where: { id: pId },
      include: {
        saleTransactions: {
          where: { isDeleted: false, status: { not: "CANCELLED" } },
          orderBy: { entryDate: "desc" }
        },
        intakeAdvances: {
          include: { supplierInvoice: true },
          orderBy: { createdAt: "desc" }
        },
        supplierInvoices: {
          where: { status: { not: "SUPERSEDED" } },
          orderBy: { entryDate: "desc" }
        },
        payments: {
          include: { allocations: true },
          orderBy: { entryDate: "desc" }
        }
      }
    });
  }

  static async getPartyActivityLogs(id) {
    const pId = parseInt(id);
    return prisma.activityLog.findMany({
      where: {
        entityType: "PARTY",
        entityId: pId
      },
      orderBy: { createdAt: "asc" }
    });
  }
}
