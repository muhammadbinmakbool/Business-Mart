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
      orderBy: [
        { entryDate: "desc" },
        { id: "desc" }
      ],
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
        { intakeNumber: { contains: q } },
        { party: { name: { contains: q } } },
        { product: { name: { contains: q } } }
      ];
    }

    if (status && status !== "ALL") {
      if (status === "SOLD") {
        where.status = { in: ["SOLD", "PARTIAL"] };
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
      if (sortField === "party.name") {
        orderByClause.push({ party: { name: direction } });
      } else if (sortField === "product.name") {
        orderByClause.push({ product: { name: direction } });
      } else {
        orderByClause.push({ [sortField]: direction });
      }
    } else {
      orderByClause.push({ entryDate: "desc" });
    }
    orderByClause.push({ id: "desc" });

    const [items, totalCount] = await Promise.all([
      prisma.intakeTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: {
          party: true,
          product: true,
          salesTracks: true,
          _count: {
            select: { advances: true }
          }
        }
      }),
      prisma.intakeTransaction.count({ where })
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
        { intakeNumber: { contains: q } },
        { party: { name: { contains: q } } },
        { product: { name: { contains: q } } }
      ];
    }

    if (dateRange && (dateRange.start || dateRange.end)) {
      baseWhere.entryDate = {};
      if (dateRange.start) baseWhere.entryDate.gte = dateRange.start;
      if (dateRange.end) baseWhere.entryDate.lte = dateRange.end;
    }

    const [allCount, pendingCount, soldCount, clearedCount, cancelledCount] = await Promise.all([
      prisma.intakeTransaction.count({ where: baseWhere }),
      prisma.intakeTransaction.count({ where: { ...baseWhere, status: "PENDING" } }),
      prisma.intakeTransaction.count({ where: { ...baseWhere, status: { in: ["SOLD", "PARTIAL"] } } }),
      prisma.intakeTransaction.count({ where: { ...baseWhere, status: "CLEARED" } }),
      prisma.intakeTransaction.count({ where: { ...baseWhere, status: "CANCELLED" } })
    ]);

    return {
      all: allCount,
      pending: pendingCount,
      sold: soldCount,
      cleared: clearedCount,
      cancelled: cancelledCount
    };
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
