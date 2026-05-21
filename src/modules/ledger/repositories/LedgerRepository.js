import { prisma } from "@/lib/prisma";

export class LedgerRepository {
  /**
   * Retrieves all saved ledger sessions sorted by creation date descending.
   */
  static async getAll() {
    return prisma.ledgerSession.findMany({
      orderBy: { createdAt: "desc" }
    });
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
   * Deletes a saved session.
   */
  static async delete(id) {
    return prisma.ledgerSession.delete({
      where: { id: parseInt(id) }
    });
  }
}
