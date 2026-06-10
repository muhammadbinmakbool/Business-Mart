import { prisma } from "@/lib/prisma";
import { assertDestructiveMode } from "@/lib/destructiveSession";

export class PartyRepository {
  static async getAll() {
    return prisma.party.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
  }

  static async getAllWithRelations() {
    return prisma.party.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
      include: {
        saleTransactions: {
          where: { isDeleted: false, status: { not: "CANCELLED" } },
          select: { finalAmount: true }
        },
        supplierInvoices: {
          where: { isDeleted: false, status: { not: "SUPERSEDED" } },
          select: { finalPayableAmount: true }
        },
        payments: {
          where: { status: "ACTIVE" },
          select: { 
            amount: true, 
            paymentType: true,
            allocations: {
              select: { allocatedAmount: true, referenceType: true }
            }
          }
        },
        intakeAdvances: {
          select: { amount: true, supplierInvoiceId: true }
        },
        openingBalance: true
      }
    });
  }

  static async getById(id) {
    return prisma.party.findUnique({
      where: { id: parseInt(id), isDeleted: false },
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
  
  /**
   * Soft deletes a party by marking it as deleted.
   * Does NOT cascade to children — they are excluded via isDeleted filters in queries.
   * @param {number} id
   * @param {{ deletedBy?: number, deleteReason?: string }} [opts]
   */
  static async softDelete(id, { deletedBy, deleteReason } = {}) {
    return prisma.party.update({
      where: { id: parseInt(id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: deletedBy || null,
        deleteReason: deleteReason || null,
      },
    });
  }

  /**
   * HARD DELETE — permanently removes the party and its related intake advances and transactions.
   * Requires an active Destructive Mode session.
   * @param {number} id
   * @param {string} [deleteReason]
   */
  static async hardDelete(id, deleteReason) {
    await assertDestructiveMode();
    // Cascade-delete related transactional data (original preserved logic)
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
        },
        openingBalance: true
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
