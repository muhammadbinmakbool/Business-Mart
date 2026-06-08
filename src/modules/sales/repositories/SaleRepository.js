import { prisma } from "@/lib/prisma";
import { assertDestructiveMode } from "@/lib/destructiveSession";

export class SaleRepository {
  static async getAll() {
    let whereClause = { isDeleted: false };
    try {
      const { getActivityAuditSettings } = await import("@/lib/settings/activityAuditSettings");
      const settings = await getActivityAuditSettings();
      if (settings.showDeletedRecords) {
        whereClause = {};
      }
    } catch (error) {
      console.error("SaleRepository: Failed to load activity audit settings, falling back to showDeletedRecords = false:", error);
    }

    return prisma.saleTransaction.findMany({
      include: {
        party: true,
        items: {
          include: { product: true }
        }
      },
      where: whereClause,
      orderBy: { createdAt: "desc" }
    });
  }

  static async getById(id) {
    return prisma.saleTransaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        party: true,
        items: {
          include: { 
            product: true,
            salesTracks: {
              include: { intakeTransaction: true }
            }
          }
        },
        adjustments: true
      }
    });
  }

  static async create(saleData, items, adjustments = []) {
    const { partyId, ...rest } = saleData;
    return prisma.saleTransaction.create({
      data: {
        ...rest,
        party: { connect: { id: parseInt(partyId) } },
        items: {
          create: items.map(item => {
            const { productId, ...itemRest } = item;
            return {
              ...itemRest,
              product: { connect: { id: parseInt(productId) } }
            };
          })
        },
        adjustments: {
          create: adjustments
        }
      },
      include: {
        items: true,
        adjustments: true
      }
    });
  }

  static async getNextSaleNumber() {
    const lastEntry = await prisma.saleTransaction.findFirst({
      orderBy: { id: "desc" }
    });
    
    const nextId = (lastEntry?.id || 0) + 1;
    return `SALE-${nextId.toString().padStart(6, "0")}`;
  }

  /**
   * Soft deletes a sale transaction by marking it as deleted.
   * @param {number} id
   * @param {{ deletedBy?: number, deleteReason?: string }} [opts]
   */
  static async softDelete(id, { deletedBy, deleteReason } = {}) {
    return prisma.saleTransaction.update({
      where: { id: parseInt(id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: deletedBy || null,
        deleteReason: deleteReason || null,
      }
    });
  }

  /**
   * HARD DELETE — permanently removes the sale transaction from the database.
   * Requires an active Destructive Mode session.
   * @param {number} id
   * @param {string} [deleteReason]
   */
  static async hardDelete(id, deleteReason) {
    await assertDestructiveMode();
    return prisma.saleTransaction.delete({
      where: { id: parseInt(id) }
    });
  }
}
