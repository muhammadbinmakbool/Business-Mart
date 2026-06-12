import { prisma } from "@/lib/prisma";
import { assertDestructiveMode } from "@/lib/destructiveSession";

export class PartyRepository {
  static async getAll() {
    return prisma.party.findMany({
      where: { isDeleted: false },
      orderBy: [
        { name: "asc" },
        { id: "desc" }
      ],
    });
  }

  static async getAllPaginated({
    page = 1,
    limit = 50,
    searchQuery = "",
    status = "ALL",
    sortField = "name",
    sortDirection = "asc"
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
        { name: { contains: q } },
        { phoneNumber: { contains: q } },
        { address: { contains: q } }
      ];
    }

    if (status === "INACTIVE") {
      where.isActive = false;
    } else {
      where.isActive = true;
      if (status === "BUYER") {
        where.partyType = { in: ["BUYER", "BOTH"] };
      } else if (status === "SUPPLIER") {
        where.partyType = { in: ["SUPPLIER", "BOTH"] };
      } else if (status === "BOTH") {
        where.partyType = "BOTH";
      }
    }

    const skip = (page - 1) * limit;

    const orderByClause = [];
    if (sortField && sortField !== "netBalance") {
      const direction = sortDirection === "asc" ? "asc" : "desc";
      orderByClause.push({ [sortField]: direction });
    } else {
      orderByClause.push({ name: "asc" });
    }
    orderByClause.push({ id: "desc" });

    // Load items with relations to calculate balances on the server
    const [items, totalCount] = await Promise.all([
      prisma.party.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
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
      }),
      prisma.party.count({ where })
    ]);

    return { items, totalCount };
  }

  static async getTabCounts({ searchQuery = "" } = {}) {
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
        { name: { contains: q } },
        { phoneNumber: { contains: q } },
        { address: { contains: q } }
      ];
    }

    const [allCount, buyerCount, supplierCount, bothCount, inactiveCount] = await Promise.all([
      prisma.party.count({ where: { ...baseWhere, isActive: true } }),
      prisma.party.count({ where: { ...baseWhere, isActive: true, partyType: { in: ["BUYER", "BOTH"] } } }),
      prisma.party.count({ where: { ...baseWhere, isActive: true, partyType: { in: ["SUPPLIER", "BOTH"] } } }),
      prisma.party.count({ where: { ...baseWhere, isActive: true, partyType: "BOTH" } }),
      prisma.party.count({ where: { ...baseWhere, isActive: false } })
    ]);

    return {
      all: allCount,
      buyer: buyerCount,
      supplier: supplierCount,
      both: bothCount,
      inactive: inactiveCount
    };
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
