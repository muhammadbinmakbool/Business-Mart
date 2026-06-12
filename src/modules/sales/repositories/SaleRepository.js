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
        { saleNumber: { contains: q } },
        { party: { name: { contains: q } } },
        { items: { some: { product: { name: { contains: q } } } } }
      ];
    }

    if (status && status !== "ALL") {
      where.status = status;
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
      if (sortField === "party.name" || sortField === "buyerName") {
        orderByClause.push({ party: { name: direction } });
      } else {
        orderByClause.push({ [sortField]: direction });
      }
    } else {
      orderByClause.push({ entryDate: "desc" });
    }
    orderByClause.push({ id: "desc" });

    const [items, totalCount] = await Promise.all([
      prisma.saleTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          party: true,
          items: {
            include: { product: true }
          }
        }
      }),
      prisma.saleTransaction.count({ where })
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
        { saleNumber: { contains: q } },
        { party: { name: { contains: q } } },
        { items: { some: { product: { name: { contains: q } } } } }
      ];
    }

    if (dateRange && (dateRange.start || dateRange.end)) {
      baseWhere.entryDate = {};
      if (dateRange.start) baseWhere.entryDate.gte = dateRange.start;
      if (dateRange.end) baseWhere.entryDate.lte = dateRange.end;
    }

    const [allCount, pendingCount, partialCount, clearedCount, cancelledCount] = await Promise.all([
      prisma.saleTransaction.count({ where: baseWhere }),
      prisma.saleTransaction.count({ where: { ...baseWhere, status: "PENDING" } }),
      prisma.saleTransaction.count({ where: { ...baseWhere, status: "PARTIAL" } }),
      prisma.saleTransaction.count({ where: { ...baseWhere, status: "CLEARED" } }),
      prisma.saleTransaction.count({ where: { ...baseWhere, status: "CANCELLED" } })
    ]);

    return {
      all: allCount,
      pending: pendingCount,
      partial: partialCount,
      cleared: clearedCount,
      cancelled: cancelledCount
    };
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
