import { prisma } from "@/lib/prisma";
import { LedgerRepository } from "../repositories/LedgerRepository";
import { calculateReconciliationSummary } from "@/lib/reconciliation";
import { withOwnership } from "@/lib/session";
import { emitActivity } from "@/modules/activity-log/activityLogger";

export class LedgerService {
  /**
   * Safe chunk-by-chunk retrieval for printing/downloading large periods.
   */
  static async getLiveReconciliationPrintData({ startDate, endDate, supplierId, buyerId, searchQuery } = {}) {
    const invoiceWhere = { status: { not: "SUPERSEDED" } };
    const saleWhere = { isDeleted: false, status: { not: "CANCELLED" } };

    if (startDate) {
      invoiceWhere.entryDate = { ...invoiceWhere.entryDate, gte: new Date(startDate) };
      saleWhere.entryDate = { ...saleWhere.entryDate, gte: new Date(startDate) };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      invoiceWhere.entryDate = { ...invoiceWhere.entryDate, lte: end };
      saleWhere.entryDate = { ...saleWhere.entryDate, lte: end };
    }
    
    if (supplierId && supplierId !== "ALL" && supplierId !== "") {
      invoiceWhere.partyId = parseInt(supplierId);
    }
    if (buyerId && buyerId !== "ALL" && buyerId !== "") {
      saleWhere.partyId = parseInt(buyerId);
    }

    // Apply database-level cross-link filters via relations
    if (supplierId && supplierId !== "ALL" && supplierId !== "") {
      const supplierInt = parseInt(supplierId);
      saleWhere.salesTracks = {
        some: {
          supplierPartyId: supplierInt
        }
      };
    }

    if (buyerId && buyerId !== "ALL" && buyerId !== "") {
      const buyerInt = parseInt(buyerId);
      invoiceWhere.items = {
        some: {
          intake: {
            salesTracks: {
              some: {
                buyerPartyId: buyerInt
              }
            }
          }
        }
      };
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const trimmedQuery = searchQuery.trim();
      invoiceWhere.OR = [
        { invoiceNumber: { contains: trimmedQuery } },
        { party: { name: { contains: trimmedQuery } } }
      ];
      saleWhere.OR = [
        { saleNumber: { contains: trimmedQuery } },
        { party: { name: { contains: trimmedQuery } } }
      ];
    }

    // Stream/batch invoices chunk by chunk (1,000 records per batch)
    const invoices = [];
    const CHUNK_SIZE = 1000;
    let invoiceOffset = 0;
    while (true) {
      const chunk = await prisma.supplierInvoice.findMany({
        where: invoiceWhere,
        select: {
          id: true,
          invoiceNumber: true,
          entryDate: true,
          createdAt: true,
          totalGrossValue: true,
          totalDeductions: true,
          totalAdvances: true,
          finalPayableAmount: true,
          status: true,
          party: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { entryDate: "desc" },
          { id: "desc" }
        ],
        skip: invoiceOffset,
        take: CHUNK_SIZE
      });
      invoices.push(...chunk);
      if (chunk.length < CHUNK_SIZE) break;
      invoiceOffset += CHUNK_SIZE;
    }

    // Stream/batch sales chunk by chunk (1,000 records per batch)
    const sales = [];
    let saleOffset = 0;
    while (true) {
      const chunk = await prisma.saleTransaction.findMany({
        where: saleWhere,
        select: {
          id: true,
          saleNumber: true,
          entryDate: true,
          baseAmount: true,
          totalAdjustments: true,
          finalAmount: true,
          status: true,
          party: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { entryDate: "desc" },
          { id: "desc" }
        ],
        skip: saleOffset,
        take: CHUNK_SIZE
      });
      sales.push(...chunk);
      if (chunk.length < CHUNK_SIZE) break;
      saleOffset += CHUNK_SIZE;
    }

    return {
      invoices: JSON.parse(JSON.stringify(invoices)),
      sales: JSON.parse(JSON.stringify(sales))
    };
  }

  /**
   * Fetches all raw active transactions for a date range and optional party filters.
   * Redirects to the chunked safe retriever to preserve backwards compatibility.
   */
  static async getLiveReconciliationData(filters = {}) {
    return this.getLiveReconciliationPrintData(filters);
  }

  /**
   * Calculates a live summary for a given filter set.
   * Runs database-level aggregations ONLY (extremely fast).
   */
  static async getLiveReconciliationSummary({ startDate, endDate, supplierId, buyerId, tolerance } = {}) {
    const invoiceWhere = { status: { not: "SUPERSEDED" } };
    const saleWhere = { isDeleted: false, status: { not: "CANCELLED" } };

    if (startDate) {
      invoiceWhere.entryDate = { ...invoiceWhere.entryDate, gte: new Date(startDate) };
      saleWhere.entryDate = { ...saleWhere.entryDate, gte: new Date(startDate) };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      invoiceWhere.entryDate = { ...invoiceWhere.entryDate, lte: end };
      saleWhere.entryDate = { ...saleWhere.entryDate, lte: end };
    }
    
    if (supplierId && supplierId !== "ALL" && supplierId !== "") {
      invoiceWhere.partyId = parseInt(supplierId);
    }
    if (buyerId && buyerId !== "ALL" && buyerId !== "") {
      saleWhere.partyId = parseInt(buyerId);
    }

    // Apply database-level cross-link filters via relations
    if (supplierId && supplierId !== "ALL" && supplierId !== "") {
      const supplierInt = parseInt(supplierId);
      saleWhere.salesTracks = {
        some: {
          supplierPartyId: supplierInt
        }
      };
    }

    if (buyerId && buyerId !== "ALL" && buyerId !== "") {
      const buyerInt = parseInt(buyerId);
      invoiceWhere.items = {
        some: {
          intake: {
            salesTracks: {
              some: {
                buyerPartyId: buyerInt
              }
            }
          }
        }
      };
    }

    const [invoiceAgg, saleAgg, invoiceCount, saleCount] = await Promise.all([
      prisma.supplierInvoice.aggregate({
        where: invoiceWhere,
        _sum: {
          totalGrossValue: true,
          totalDeductions: true,
          totalAdvances: true,
          finalPayableAmount: true
        }
      }),
      prisma.saleTransaction.aggregate({
        where: saleWhere,
        _sum: {
          baseAmount: true,
          totalAdjustments: true,
          finalAmount: true
        }
      }),
      prisma.supplierInvoice.count({ where: invoiceWhere }),
      prisma.saleTransaction.count({ where: saleWhere })
    ]);

    const difference = Number(saleAgg._sum.finalAmount || 0) - Number(invoiceAgg._sum.finalPayableAmount || 0);
    const tol = tolerance !== undefined ? Number(tolerance) : 0.01;

    return {
      supplier: {
        gross: Number(invoiceAgg._sum.totalGrossValue || 0),
        deductions: Number(invoiceAgg._sum.totalDeductions || 0),
        advances: Number(invoiceAgg._sum.totalAdvances || 0),
        baseTotal: Number(invoiceAgg._sum.finalPayableAmount || 0),
        activeCount: invoiceCount
      },
      buyer: {
        base: Number(saleAgg._sum.baseAmount || 0),
        adjustments: Number(saleAgg._sum.totalAdjustments || 0),
        baseTotal: Number(saleAgg._sum.finalAmount || 0),
        activeCount: saleCount
      },
      difference,
      matched: Math.abs(difference) <= tol
    };
  }

  /**
   * Queries a paginated list of supplier invoices.
   */
  static async getLiveInvoices({ startDate, endDate, supplierId, buyerId, searchQuery, page = 1, limit = 50 } = {}) {
    const invoiceWhere = { status: { not: "SUPERSEDED" } };

    if (startDate) {
      invoiceWhere.entryDate = { ...invoiceWhere.entryDate, gte: new Date(startDate) };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      invoiceWhere.entryDate = { ...invoiceWhere.entryDate, lte: end };
    }
    
    if (supplierId && supplierId !== "ALL" && supplierId !== "") {
      invoiceWhere.partyId = parseInt(supplierId);
    }

    if (buyerId && buyerId !== "ALL" && buyerId !== "") {
      const buyerInt = parseInt(buyerId);
      invoiceWhere.items = {
        some: {
          intake: {
            salesTracks: {
              some: {
                buyerPartyId: buyerInt
              }
            }
          }
        }
      };
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const trimmedQuery = searchQuery.trim();
      invoiceWhere.OR = [
        { invoiceNumber: { contains: trimmedQuery } },
        { party: { name: { contains: trimmedQuery } } }
      ];
    }

    const [items, totalCount] = await Promise.all([
      prisma.supplierInvoice.findMany({
        where: invoiceWhere,
        select: {
          id: true,
          invoiceNumber: true,
          entryDate: true,
          createdAt: true,
          totalGrossValue: true,
          totalDeductions: true,
          totalAdvances: true,
          finalPayableAmount: true,
          status: true,
          party: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { entryDate: "desc" },
          { id: "desc" }
        ],
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.supplierInvoice.count({ where: invoiceWhere })
    ]);

    return {
      items: JSON.parse(JSON.stringify(items)),
      totalCount
    };
  }

  /**
   * Queries a paginated list of sale transactions.
   */
  static async getLiveSales({ startDate, endDate, supplierId, buyerId, searchQuery, page = 1, limit = 50 } = {}) {
    const saleWhere = { isDeleted: false, status: { not: "CANCELLED" } };

    if (startDate) {
      saleWhere.entryDate = { ...saleWhere.entryDate, gte: new Date(startDate) };
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      saleWhere.entryDate = { ...saleWhere.entryDate, lte: end };
    }
    
    if (buyerId && buyerId !== "ALL" && buyerId !== "") {
      saleWhere.partyId = parseInt(buyerId);
    }

    if (supplierId && supplierId !== "ALL" && supplierId !== "") {
      const supplierInt = parseInt(supplierId);
      saleWhere.salesTracks = {
        some: {
          supplierPartyId: supplierInt
        }
      };
    }

    if (searchQuery && searchQuery.trim() !== "") {
      const trimmedQuery = searchQuery.trim();
      saleWhere.OR = [
        { saleNumber: { contains: trimmedQuery } },
        { party: { name: { contains: trimmedQuery } } }
      ];
    }

    const [items, totalCount] = await Promise.all([
      prisma.saleTransaction.findMany({
        where: saleWhere,
        select: {
          id: true,
          saleNumber: true,
          entryDate: true,
          baseAmount: true,
          totalAdjustments: true,
          finalAmount: true,
          status: true,
          party: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { entryDate: "desc" },
          { id: "desc" }
        ],
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.saleTransaction.count({ where: saleWhere })
    ]);

    return {
      items: JSON.parse(JSON.stringify(items)),
      totalCount
    };
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

    await emitActivity({
      entityType: "SYSTEM",
      entityId: session.id,
      action: "CREATED",
      description: `Reconciliation session "${session.title}" created for period ${startDate} to ${endDate}. Diff: Rs. ${Number(session.difference).toLocaleString()}`,
      meta: {
        title: session.title,
        startDate,
        endDate,
        difference: Number(session.difference),
        supplierTotal: Number(session.supplierTotal),
        buyerTotal: Number(session.buyerTotal)
      }
    });

    return JSON.parse(JSON.stringify(session));
  }

  static async listSessions() {
    const sessions = await LedgerRepository.getAll();
    return JSON.parse(JSON.stringify(sessions));
  }

  static async listSessionsPaginated({
    page = 1,
    limit = 50,
    searchQuery = ""
  } = {}) {
    const { clampLimit } = await import("@/lib/pagination");
    const clampedLimit = clampLimit(limit);

    const { items, totalCount } = await LedgerRepository.getAllPaginated({
      page,
      limit: clampedLimit,
      searchQuery
    });

    return {
      items: JSON.parse(JSON.stringify(items)),
      totalCount
    };
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

    await emitActivity({
      entityType: "SYSTEM",
      entityId: updated.id,
      action: "UPDATED",
      description: `Reconciliation session "${updated.title}" status updated to ${newStatus}`,
      meta: {
        title: updated.title,
        status: updated.status
      }
    });

    return JSON.parse(JSON.stringify(updated));
  }

  /**
   * Soft-deletes a session, respecting the soft lock rule.
   */
  static async deleteSession(id, deleteReason) {
    const session = await LedgerRepository.getById(id);
    if (!session) throw new Error("Session not found");

    if (session.status === "LOCKED") {
      throw new Error("Cannot delete a LOCKED session. Please unlock it first.");
    }

    let deletedBy = null;
    try {
      const { getSession: getAuthSession } = await import("@/lib/session");
      const authSession = await getAuthSession();
      if (authSession) deletedBy = authSession.userId;
    } catch (e) {}

    await LedgerRepository.softDelete(id, { deletedBy, deleteReason });

    await emitActivity({
      entityType: "SYSTEM",
      entityId: session.id,
      action: "DELETED",
      description: `Reconciliation session "${session.title}" soft-deleted.${deleteReason ? ` Reason: ${deleteReason}` : ""}`,
      meta: {
        title: session.title,
        deleteReason
      }
    });

    return { success: true };
  }

  /**
   * HARD DELETE — permanently removes the session from the database.
   * Requires an active Destructive Mode session.
   */
  static async hardDeleteSession(id, force = false, deleteReason) {
    const session = await LedgerRepository.getById(id);
    if (!session) throw new Error("Session not found");

    if (session.status === "LOCKED" && !force) {
      throw new Error("Cannot hard delete a LOCKED session. Please unlock it first.");
    }

    await LedgerRepository.hardDelete(id, deleteReason);

    await emitActivity({
      entityType: "SYSTEM",
      entityId: session.id,
      action: "HARD_DELETED",
      description: `Reconciliation session "${session.title}" PERMANENTLY deleted.${deleteReason ? ` Reason: ${deleteReason}` : ""}`,
      meta: {
        title: session.title,
        deleteReason
      }
    });

    return { success: true };
  }
}
