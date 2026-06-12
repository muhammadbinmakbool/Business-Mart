import { prisma } from "@/lib/prisma";
import { assertDestructiveMode } from "@/lib/destructiveSession";

export class LedgerRepository {
  /**
   * Retrieves all saved ledger sessions sorted by creation date descending.
   */
  static async getAll() {
    return prisma.ledgerSession.findMany({
      where: { isDeleted: false },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" }
      ]
    });
  }

  static async getAllPaginated({
    page = 1,
    limit = 50,
    searchQuery = ""
  } = {}) {
    let showDeleted = false;
    try {
      const { getActivityAuditSettings } = await import("@/lib/settings/activityAuditSettings");
      const settings = await getActivityAuditSettings();
      showDeleted = settings.showDeletedRecords;
    } catch (e) {}

    const where = showDeleted ? {} : { isDeleted: false };

    if (searchQuery) {
      where.title = { contains: searchQuery.trim() };
    }

    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      prisma.ledgerSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" }
        ]
      }),
      prisma.ledgerSession.count({ where })
    ]);

    return { items, totalCount };
  }


  /**
   * Retrieves a single ledger session by ID.
   */
  static async getById(id) {
    return prisma.ledgerSession.findUnique({
      where: { id: parseInt(id) }
    });
  }

  /**
   * Saves a new ledger session.
   */
  static async create(sessionData) {
    const { title, startDate, endDate, supplierTotal, buyerTotal, difference, supplierInvoiceCount, buyerInvoiceCount, status, notes } = sessionData;
    return prisma.ledgerSession.create({
      data: {
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        supplierTotal: Number(supplierTotal),
        buyerTotal: Number(buyerTotal),
        difference: Number(difference),
        supplierInvoiceCount: parseInt(supplierInvoiceCount || 0),
        buyerInvoiceCount: parseInt(buyerInvoiceCount || 0),
        status: status || "OPEN",
        notes
      }
    });
  }

  /**
   * Updates the status of a saved session.
   */
  static async updateStatus(id, status) {
    return prisma.ledgerSession.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }

  /**
   * Soft deletes a ledger session by marking it as deleted.
   * @param {number} id
   * @param {{ deletedBy?: number, deleteReason?: string }} [opts]
   */
  static async softDelete(id, { deletedBy, deleteReason } = {}) {
    return prisma.ledgerSession.update({
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
   * HARD DELETE — permanently removes the ledger session from the database.
   * Requires an active Destructive Mode session.
   * @param {number} id
   * @param {string} [deleteReason]
   */
  static async hardDelete(id, deleteReason) {
    await assertDestructiveMode();
    return prisma.ledgerSession.delete({
      where: { id: parseInt(id) }
    });
  }
}
