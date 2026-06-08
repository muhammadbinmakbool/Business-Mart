import { prisma } from "@/lib/prisma";
import { assertDestructiveMode } from "@/lib/destructiveSession";

export class IntakeRepository {
  static async getAll() {
    return prisma.intakeTransaction.findMany({
      where: { isDeleted: false },
      include: {
        party: true,
        product: true,
        salesTracks: true,
        _count: {
          select: { advances: true }
        }
      },
      orderBy: { id: "desc" },
    });
  }

  static async getById(id) {
    return prisma.intakeTransaction.findUnique({
      where: { id: parseInt(id), isDeleted: false },
      include: {
        party: true,
        product: true,
        advances: true,
        invoiceItems: {
          include: {
            invoice: true
          }
        },
        salesTracks: {
          include: {
            buyer: true,
            saleTransaction: true
          }
        }
      }
    });
  }


  static async create(data) {
    const { partyId, productId, ...rest } = data;
    const nextNumber = await this.getNextIntakeNumber();
    
    return prisma.intakeTransaction.create({
      data: {
        ...rest,
        rate: data.rate ?? null,
        intakeNumber: nextNumber,
        party: { connect: { id: parseInt(partyId) } },
        product: { connect: { id: parseInt(productId) } }
      }
    });
  }

  static async update(id, data) {
    return prisma.intakeTransaction.update({
      where: { id: parseInt(id) },
      data
    });
  }

  /**
   * Soft deletes an intake transaction by marking it as deleted.
   * Does NOT cascade to advances — they are excluded via query filters.
   * @param {number} id
   * @param {{ deletedBy?: number, deleteReason?: string }} [opts]
   */
  static async softDelete(id, { deletedBy, deleteReason } = {}) {
    return prisma.intakeTransaction.update({
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
   * HARD DELETE — permanently removes the intake and its linked advances.
   * Requires an active Destructive Mode session.
   * @param {number} id
   * @param {string} [deleteReason]
   */
  static async hardDelete(id, deleteReason) {
    await assertDestructiveMode();
    // Delete linked advances first (original preserved logic)
    await prisma.intakeAdvance.deleteMany({
      where: { intakeTransactionId: parseInt(id) }
    });
    return prisma.intakeTransaction.delete({
      where: { id: parseInt(id) }
    });
  }

  static async getUninvoicedByPartyId(partyId) {
    return prisma.intakeTransaction.findMany({
      where: {
        partyId: parseInt(partyId),
        status: { in: ["SOLD", "PARTIAL"] },
        OR: [
          {
            invoiceItems: {
              none: {
                invoice: {
                  status: { not: "SUPERSEDED" }
                }
              }
            }
          },
          {
            salesTracks: {
              some: {
                isSettled: false
              }
            }
          }
        ]
      },
      include: { 
        product: true,
        salesTracks: true
      }
    });
  }

  static async getNextIntakeNumber() {
    const lastEntry = await prisma.intakeTransaction.findFirst({
      orderBy: { id: "desc" }
    });

    const nextId = lastEntry ? lastEntry.id + 1 : 1;
    return `INT-${nextId.toString().padStart(6, "0")}`;
  }
}
