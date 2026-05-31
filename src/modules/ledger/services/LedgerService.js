import { prisma } from "@/lib/prisma";
import { LedgerRepository } from "../repositories/LedgerRepository";
import { calculateReconciliationSummary } from "@/lib/reconciliation";
import { withOwnership } from "@/lib/session";

export class LedgerService {
  /**
   * Fetches all raw active transactions for a date range and optional party filters.
   * Leverages Prisma joins to avoid N+1 queries.
   */
  static async getLiveReconciliationData({ startDate, endDate, supplierId, buyerId } = {}) {
    const invoiceWhere = { status: { not: "SUPERSEDED" } };
    const saleWhere = { isDeleted: false, status: { not: "CANCELLED" } };

    if (startDate) {
      invoiceWhere.entryDate = { ...invoiceWhere.entryDate, gte: new Date(startDate) };
      saleWhere.entryDate = { ...saleWhere.entryDate, gte: new Date(startDate) };
    }
    if (endDate) {
      // Set end date to end of day to include all transactions on that day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      invoiceWhere.entryDate = { ...invoiceWhere.entryDate, lte: end };
      saleWhere.entryDate = { ...saleWhere.entryDate, lte: end };
    }
    
    // Note: On the supplier side, we query by supplierId.
    if (supplierId && supplierId !== "ALL" && supplierId !== "") {
      invoiceWhere.partyId = parseInt(supplierId);
    }
    
    // Note: On the buyer side, we query by buyerId.
    if (buyerId && buyerId !== "ALL" && buyerId !== "") {
      saleWhere.partyId = parseInt(buyerId);
    }

    const [invoices, sales] = await Promise.all([
      prisma.supplierInvoice.findMany({
        where: invoiceWhere,
        include: {
          party: true,
          items: {
            include: {
              intake: {
                include: {
                  product: true,
                  salesTracks: true
                }
              },
              adjustments: true
            }
          },
          advances: true
        },
        orderBy: { entryDate: "desc" }
      }),
      prisma.saleTransaction.findMany({
        where: saleWhere,
        include: {
          party: true,
          salesTracks: {
            include: {
              product: true
            }
          },
          adjustments: true,
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: { entryDate: "desc" }
      })
    ]);

    // Apply cross-link filters if filtering by one party only, since source tracking links them
    let filteredInvoices = invoices;
    let filteredSales = sales;

    if (supplierId && supplierId !== "ALL" && supplierId !== "") {
      const supplierInt = parseInt(supplierId);
      // Filter sales to show only those linked to this supplier via SalesTrack
      filteredSales = sales.filter(sale =>
        sale.salesTracks?.some(track => track.supplierPartyId === supplierInt)
      );
    }

    if (buyerId && buyerId !== "ALL" && buyerId !== "") {
      const buyerInt = parseInt(buyerId);
      // Filter supplier invoices to show only those linked to this buyer via SalesTrack on the items' intakes
      filteredInvoices = invoices.filter(inv =>
        inv.items?.some(item =>
          item.intake?.salesTracks?.some(track => track.buyerPartyId === buyerInt)
        )
      );
    }

    return {
      invoices: JSON.parse(JSON.stringify(filteredInvoices)),
      sales: JSON.parse(JSON.stringify(filteredSales))
    };
  }

  /**
   * Calculates a live summary for a given filter set.
   */
  static async getLiveReconciliationSummary({ startDate, endDate, supplierId, buyerId, tolerance } = {}) {
    const { invoices, sales } = await this.getLiveReconciliationData({ startDate, endDate, supplierId, buyerId });
    return calculateReconciliationSummary(invoices, sales, tolerance);
  }

  /**
   * Saves a reconciliation session snapshot.
   * Calculates current totals on the server to prevent UI manipulation.
   */
  static async createSession(data) {
    const { title, startDate, endDate, notes, status } = data;

    if (!title) throw new Error("Title is required");
    if (!startDate || !endDate) throw new Error("Start date and End date are required");

    // Fetch live summary for this range (do not filter by party for period-wide locking)
    const summary = await this.getLiveReconciliationSummary({ startDate, endDate });

    const sessionPayload = await withOwnership({
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      supplierTotal: summary.supplier.baseTotal,
      buyerTotal: summary.buyer.baseTotal,
      difference: summary.difference,
      supplierInvoiceCount: summary.supplier.activeCount,
      buyerInvoiceCount: summary.buyer.activeCount,
      status: status || "OPEN",
      notes
    });

    const session = await LedgerRepository.create(sessionPayload);

    return JSON.parse(JSON.stringify(session));
  }

  /**
   * Lists all saved sessions, including drift checks.
   */
  static async listSessions() {
    const sessions = await LedgerRepository.getAll();
    return JSON.parse(JSON.stringify(sessions));
  }

  /**
   * Gets a specific saved session, including full drift comparison and live active records.
   */
  static async getSessionDetails(id) {
    const session = await LedgerRepository.getById(id);
    if (!session) throw new Error("Session not found");

    // Fetch live data for the same period to calculate live values
    const liveData = await this.getLiveReconciliationData({
      startDate: session.startDate,
      endDate: session.endDate
    });

    const liveSummary = calculateReconciliationSummary(liveData.invoices, liveData.sales);

    const liveSupplierTotal = Number(liveSummary.supplier.baseTotal);
    const liveBuyerTotal = Number(liveSummary.buyer.baseTotal);
    const liveDifference = Number(liveSummary.difference);

    const savedSupplierTotal = Number(session.supplierTotal);
    const savedBuyerTotal = Number(session.buyerTotal);
    const savedDifference = Number(session.difference);

    // Drift check
    const hasDrift = 
      liveSupplierTotal !== savedSupplierTotal ||
      liveBuyerTotal !== savedBuyerTotal ||
      session.supplierInvoiceCount !== liveSummary.supplier.activeCount ||
      session.buyerInvoiceCount !== liveSummary.buyer.activeCount;

    return {
      session: JSON.parse(JSON.stringify(session)),
      liveSummary,
      drift: {
        hasDrift,
        supplierDiff: liveSupplierTotal - savedSupplierTotal,
        buyerDiff: liveBuyerTotal - savedBuyerTotal,
        differenceDiff: liveDifference - savedDifference,
        supplierCountDiff: liveSummary.supplier.activeCount - session.supplierInvoiceCount,
        buyerCountDiff: liveSummary.buyer.activeCount - session.buyerInvoiceCount,
        liveSupplierTotal,
        liveBuyerTotal,
        liveDifference
      },
      invoices: liveData.invoices,
      sales: liveData.sales
    };
  }

  /**
   * Soft lock check: toggles a session's locked status.
   */
  static async toggleLockSession(id) {
    const session = await LedgerRepository.getById(id);
    if (!session) throw new Error("Session not found");

    const newStatus = session.status === "LOCKED" ? "OPEN" : "LOCKED";
    const updated = await LedgerRepository.updateStatus(id, newStatus);
    return JSON.parse(JSON.stringify(updated));
  }

  /**
   * Deletes a session, respecting the soft lock rule.
   */
  static async deleteSession(id, force = false) {
    const session = await LedgerRepository.getById(id);
    if (!session) throw new Error("Session not found");

    if (session.status === "LOCKED" && !force) {
      throw new Error("Cannot delete a LOCKED session. Please unlock it first.");
    }

    await LedgerRepository.delete(id);
    return { success: true };
  }
}
