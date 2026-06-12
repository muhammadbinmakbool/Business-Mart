import { prisma } from "@/lib/prisma";
import { assertDestructiveMode } from "@/lib/destructiveSession";

export class SupplierInvoiceRepository {
  static async getNextInvoiceNumber() {
    const lastInvoice = await prisma.supplierInvoice.findFirst({
      orderBy: { id: "desc" },
      select: { id: true }
    });
    const nextId = (lastInvoice?.id || 0) + 1;
    return `SUP-${nextId.toString().padStart(6, "0")}`;
  }

  static async getAll() {
    return prisma.supplierInvoice.findMany({
      where: { isDeleted: false },
      include: { party: true },
      orderBy: [
        { entryDate: "desc" },
        { id: "desc" }
      ]
    });
  }

  static async getAllPaginated({
    page = 1,
    limit = 50,
    searchQuery = "",
    status = "ALL",
    dateRange = null,
    sortField = "entryDate",
    sortDirection = "desc"
  } = {}) {
    let showDeleted = false;
    try {
      const { getActivityAuditSettings } = await import("@/lib/settings/activityAuditSettings");
      const settings = await getActivityAuditSettings();
      showDeleted = settings.showDeletedRecords;
    } catch (e) {}

    const where = showDeleted ? {} : { isDeleted: false };

    if (searchQuery) {
      const q = searchQuery.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { party: { name: { contains: q } } }
      ];
    }

    if (status) {
      if (status === "ALL") {
        where.status = { not: "SUPERSEDED" };
      } else {
        where.status = status;
      }
    }

    if (dateRange && (dateRange.start || dateRange.end)) {
      where.entryDate = {};
      if (dateRange.start) where.entryDate.gte = dateRange.start;
      if (dateRange.end) where.entryDate.lte = dateRange.end;
    }

    const skip = (page - 1) * limit;

    const orderByClause = [];
    if (sortField) {
      const direction = sortDirection === "asc" ? "asc" : "desc";
      if (sortField === "party.name" || sortField === "supplierName") {
        orderByClause.push({ party: { name: direction } });
      } else {
        orderByClause.push({ [sortField]: direction });
      }
    } else {
      orderByClause.push({ entryDate: "desc" });
    }
    orderByClause.push({ id: "desc" });

    const [items, totalCount] = await Promise.all([
      prisma.supplierInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: { party: true }
      }),
      prisma.supplierInvoice.count({ where })
    ]);

    return { items, totalCount };
  }

  static async getTabCounts({ searchQuery = "", dateRange = null } = {}) {
    let showDeleted = false;
    try {
      const { getActivityAuditSettings } = await import("@/lib/settings/activityAuditSettings");
      const settings = await getActivityAuditSettings();
      showDeleted = settings.showDeletedRecords;
    } catch (e) {}

    const baseWhere = showDeleted ? {} : { isDeleted: false };

    if (searchQuery) {
      const q = searchQuery.trim();
      baseWhere.OR = [
        { invoiceNumber: { contains: q } },
        { party: { name: { contains: q } } }
      ];
    }

    if (dateRange && (dateRange.start || dateRange.end)) {
      baseWhere.entryDate = {};
      if (dateRange.start) baseWhere.entryDate.gte = baseWhere.entryDate.gte = dateRange.start;
      if (dateRange.end) baseWhere.entryDate.lte = dateRange.end;
    }

    const [allCount, pendingCount, partialCount, clearedCount, supersededCount] = await Promise.all([
      prisma.supplierInvoice.count({ where: { ...baseWhere, status: { not: "SUPERSEDED" } } }),
      prisma.supplierInvoice.count({ where: { ...baseWhere, status: "PENDING" } }),
      prisma.supplierInvoice.count({ where: { ...baseWhere, status: "PARTIAL" } }),
      prisma.supplierInvoice.count({ where: { ...baseWhere, status: "CLEARED" } }),
      prisma.supplierInvoice.count({ where: { ...baseWhere, status: "SUPERSEDED" } })
    ]);

    return {
      all: allCount,
      pending: pendingCount,
      partial: partialCount,
      cleared: clearedCount,
      superseded: supersededCount
    };
  }


  static async getByPartyId(partyId) {
    return prisma.supplierInvoice.findMany({
      where: { partyId: parseInt(partyId), isDeleted: false },
      orderBy: { createdAt: "desc" }
    });
  }

  static async getById(id) {
    return prisma.supplierInvoice.findUnique({
      where: { id: parseInt(id) },
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
      }
    });
  }

  static async createWithItems(invoiceData, itemsData, advanceIds, selectedTrackIds = []) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.supplierInvoice.create({
        data: {
          ...invoiceData,
          items: {
            create: itemsData.map(item => ({
              weight: item.weight,
              rate: item.rate,
              amount: item.amount,
              userId: invoiceData.userId || 0,
              businessId: invoiceData.businessId || 0,
              intake: { connect: { id: parseInt(item.intakeTransactionId) } },
              adjustments: {
                create: (item.adjustments || []).map(adj => ({
                  adjustmentType: adj.adjustmentType,
                  method: adj.method,
                  value: adj.value,
                  calculatedAmount: adj.calculatedAmount,
                  direction: adj.direction,
                  unit: adj.unit || null,
                  userId: invoiceData.userId || 0,
                  businessId: invoiceData.businessId || 0
                }))
              }
            }))
          },
          advances: {
            connect: advanceIds.map(id => ({ id: parseInt(id) }))
          }
        },
        include: {
          items: {
            include: {
              intake: { include: { product: true } },
              adjustments: true
            }
          },
          advances: true,
          party: true
        }
      });

      if (selectedTrackIds && selectedTrackIds.length > 0) {
        await tx.salesTrack.updateMany({
          where: {
            id: { in: selectedTrackIds }
          },
          data: {
            isSettled: true
          }
        });
      } else {
        const intakeIds = itemsData.map(item => parseInt(item.intakeTransactionId));
        await tx.salesTrack.updateMany({
          where: {
            intakeTransactionId: { in: intakeIds },
            isSettled: false
          },
          data: {
            isSettled: true
          }
        });
      }

      return invoice;
    });
  }

  static async updateStatus(id, status, isOutdated = false) {
    return prisma.supplierInvoice.update({
      where: { id: parseInt(id) },
      data: { status, isOutdated }
    });
  }

  /**
   * Checks if an invoice is stale by comparing linked records' updatedAt with invoice.lastCalculatedAt.
   */
  static async checkStaleness(id) {
    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id: parseInt(id) },
      include: { 
        items: { select: { intakeTransactionId: true } },
        advances: { select: { id: true } }
      }
    });

    if (!invoice || invoice.status === "SUPERSEDED") return false;

    const intakeIds = invoice.items.map(i => i.intakeTransactionId);
    const advanceIds = invoice.advances.map(a => a.id);

    const [maxIntakeUpdate, maxAdvanceUpdate] = await Promise.all([
      prisma.intakeTransaction.aggregate({
        where: { id: { in: intakeIds } },
        _max: { updatedAt: true }
      }),
      prisma.intakeAdvance.aggregate({
        where: { id: { in: advanceIds } },
        _max: { updatedAt: true }
      })
    ]);

    const latestIntakeUpdate = maxIntakeUpdate._max.updatedAt || new Date(0);
    const latestAdvanceUpdate = maxAdvanceUpdate._max.updatedAt || new Date(0);
    
    // Use a 5-second safety buffer to prevent database transaction latency and @updatedAt write timing offsets
    // from triggering instant false-positive staleness right after invoice creation.
    const bufferMs = 5000;
    const thresholdDate = new Date(invoice.lastCalculatedAt.getTime() + bufferMs);
    const stale = latestIntakeUpdate > thresholdDate || latestAdvanceUpdate > thresholdDate;
    
    if (stale && !invoice.isOutdated) {
      await prisma.supplierInvoice.update({
        where: { id: parseInt(id) },
        data: { isOutdated: true }
      });
      return true;
    }

    return stale;
  }
  /**
   * Soft deletes a supplier invoice by marking it as deleted.
   * @param {number} id
   * @param {{ deletedBy?: number, deleteReason?: string }} [opts]
   */
  static async softDelete(id, { deletedBy, deleteReason } = {}) {
    return prisma.supplierInvoice.update({
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
   * HARD DELETE — permanently removes the invoice from the database.
   * The cascade on SupplierInvoiceItem and SupplierInvoiceAdjustment is handled by the DB schema.
   * Requires an active Destructive Mode session.
   * @param {number} id
   * @param {string} [deleteReason]
   */
  static async hardDelete(id, deleteReason) {
    await assertDestructiveMode();
    return prisma.supplierInvoice.delete({
      where: { id: parseInt(id) }
    });
  }
}
