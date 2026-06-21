import { prisma } from "@/lib/prisma";
import { DEFAULT_WEIGHT_UNIT } from "@/lib/units";
import { withOwnership } from "@/lib/session";
import { assertDestructiveMode } from "@/lib/destructiveSession";

export class SalesTrackService {
  /**
   * Returns all source tracking entries with related informational data.
   */
  static async list() {
    const tracks = await prisma.salesTrack.findMany({
      where: { isDeleted: false },
      include: {
        saleTransaction: true,
        intakeTransaction: true,
        supplier: true,
        buyer: true,
        product: true
      },
      orderBy: { createdAt: "desc" }
    });
    return JSON.parse(JSON.stringify(tracks));
  }

  static async listPaginated({
    page = 1,
    limit = 50,
    searchQuery = "",
    preset = "all",
    startDate = "",
    endDate = "",
    month = "",
    sortField = "createdAt",
    sortDirection = "desc"
  } = {}) {
    const { clampLimit } = await import("@/lib/pagination");
    const clampedLimit = clampLimit(limit);
    const skip = (page - 1) * clampedLimit;

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
        { product: { name: { contains: q } } },
        { supplier: { name: { contains: q } } },
        { buyer: { name: { contains: q } } },
        { saleTransaction: { saleNumber: { contains: q } } },
        { intakeTransaction: { intakeNumber: { contains: q } } }
      ];
    }

    if (preset && preset !== "all") {
      const { getDateRangeFromFilter } = await import("@/lib/dateFilters");
      const { start, end } = getDateRangeFromFilter({ preset, startDate, endDate, month });
      if (start || end) {
        where.createdAt = {};
        if (start) where.createdAt.gte = start;
        if (end) where.createdAt.lte = end;
      }
    }

    const orderByClause = [];
    if (sortField) {
      const direction = sortDirection === "asc" ? "asc" : "desc";
      if (sortField === "productName") {
        orderByClause.push({ product: { name: direction } });
      } else if (sortField === "supplierName") {
        orderByClause.push({ supplier: { name: direction } });
      } else if (sortField === "buyerName") {
        orderByClause.push({ buyer: { name: direction } });
      } else if (sortField === "refNumber") {
        // refNumber is computed from saleNumber/intakeNumber, sort by createdAt as fallback
        orderByClause.push({ createdAt: direction });
      } else {
        orderByClause.push({ [sortField]: direction });
      }
    } else {
      orderByClause.push({ createdAt: "desc" });
    }
    orderByClause.push({ id: "desc" });

    const [items, totalCount] = await Promise.all([
      prisma.salesTrack.findMany({
        where,
        skip,
        take: clampedLimit,
        include: {
          saleTransaction: true,
          intakeTransaction: true,
          supplier: true,
          buyer: true,
          product: true
        },
        orderBy: orderByClause
      }),
      prisma.salesTrack.count({ where })
    ]);

    return {
      items: JSON.parse(JSON.stringify(items)),
      totalCount
    };
  }

  static async create(data) {
    if (data.intakeTransactionId) {
      const existing = await prisma.salesTrack.findUnique({
        where: { intakeTransactionId: parseInt(data.intakeTransactionId) }
      });
      if (existing) {
        throw new Error("This intake transaction is already mapped to a Sales Track entry.");
      }
    }

    const ownership = await withOwnership();

    return prisma.salesTrack.create({
      data: {
        saleTransactionId: data.saleTransactionId ? parseInt(data.saleTransactionId) : null,
        saleItemId: data.saleItemId ? parseInt(data.saleItemId) : null,
        intakeTransactionId: data.intakeTransactionId ? parseInt(data.intakeTransactionId) : null,
        supplierPartyId: data.supplierPartyId ? parseInt(data.supplierPartyId) : null,
        buyerPartyId: data.buyerPartyId ? parseInt(data.buyerPartyId) : null,
        productId: data.productId ? parseInt(data.productId) : null,
        quantity: data.quantity,
        buyingRate: data.buyingRate ? Number(data.buyingRate) : null,
        sellingRate: data.sellingRate ? Number(data.sellingRate) : null,
        netWeight: data.netWeight ? Number(data.netWeight) : null,
        baseAmount: data.baseAmount ? Number(data.baseAmount) : null,
        notes: data.notes,
        userId: ownership.userId,
        businessId: ownership.businessId
      }
    });
  }

  static async update(id, data) {
    if (data.intakeTransactionId) {
      const existing = await prisma.salesTrack.findUnique({
        where: { intakeTransactionId: parseInt(data.intakeTransactionId) }
      });
      if (existing && existing.id !== parseInt(id)) {
        throw new Error("This intake transaction is already mapped to another Sales Track entry.");
      }
    }

    const ownership = await withOwnership();

    return prisma.salesTrack.update({
      where: { id: parseInt(id) },
      data: {
        saleTransactionId: data.saleTransactionId ? parseInt(data.saleTransactionId) : null,
        saleItemId: data.saleItemId ? parseInt(data.saleItemId) : null,
        intakeTransactionId: data.intakeTransactionId ? parseInt(data.intakeTransactionId) : null,
        supplierPartyId: data.supplierPartyId ? parseInt(data.supplierPartyId) : null,
        buyerPartyId: data.buyerPartyId ? parseInt(data.buyerPartyId) : null,
        productId: data.productId ? parseInt(data.productId) : null,
        quantity: data.quantity,
        buyingRate: data.buyingRate ? Number(data.buyingRate) : null,
        sellingRate: data.sellingRate ? Number(data.sellingRate) : null,
        netWeight: data.netWeight ? Number(data.netWeight) : null,
        baseAmount: data.baseAmount ? Number(data.baseAmount) : null,
        notes: data.notes,
        userId: ownership.userId,
        businessId: ownership.businessId
      }
    });
  }

  /**
   * Soft deletes a source tracking entry.
   * @param {number} id
   * @param {{ deletedBy?: number, deleteReason?: string }} [opts]
   */
  static async delete(id, { deletedBy, deleteReason } = {}) {
    return prisma.salesTrack.update({
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
   * HARD DELETE — permanently removes the source tracking entry.
   * Requires an active Destructive Mode session.
   */
  static async hardDelete(id, deleteReason) {
    await assertDestructiveMode();
    return prisma.salesTrack.delete({
      where: { id: parseInt(id) }
    });
  }

  static async getById(id) {
    const track = await prisma.salesTrack.findUnique({
      where: { id: parseInt(id) },
      include: {
        saleTransaction: true,
        intakeTransaction: true,
        supplier: true,
        buyer: true,
        product: true
      }
    });
    return JSON.parse(JSON.stringify(track));
  }

  static async listUnbilledByBuyer(buyerPartyId) {
    const tracks = await prisma.salesTrack.findMany({
      where: {
        buyerPartyId: parseInt(buyerPartyId),
        isBilled: false,
      },
      include: {
        intakeTransaction: true,
        product: true
      },
      orderBy: { createdAt: "desc" }
    });
    return tracks.map(track => ({
      id: track.id,
      saleTransactionId: track.saleTransactionId,
      saleItemId: track.saleItemId,
      intakeTransactionId: track.intakeTransactionId,
      supplierPartyId: track.supplierPartyId,
      buyerPartyId: track.buyerPartyId,
      productId: track.productId,
      quantity: Number(track.quantity),
      buyingRate: track.buyingRate ? Number(track.buyingRate) : null,
      sellingRate: track.sellingRate ? Number(track.sellingRate) : null,
      netWeight: track.netWeight ? Number(track.netWeight) : null,
      baseAmount: track.baseAmount ? Number(track.baseAmount) : null,
      rateUnit: track.rateUnit || DEFAULT_WEIGHT_UNIT,
      isBilled: track.isBilled,
      isSettled: track.isSettled,
      notes: track.notes,
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString(),
      intakeTransaction: track.intakeTransaction ? {
        id: track.intakeTransaction.id,
        intakeNumber: track.intakeTransaction.intakeNumber,
        entryDate: track.intakeTransaction.entryDate.toISOString(),
        partyId: track.intakeTransaction.partyId,
        productId: track.intakeTransaction.productId,
        bagCount: track.intakeTransaction.bagCount,
        rate: track.intakeTransaction.rate ? Number(track.intakeTransaction.rate) : null,
        rateUnit: track.intakeTransaction.rateUnit || DEFAULT_WEIGHT_UNIT,
        grossWeight: Number(track.intakeTransaction.grossWeight),
        unit: track.intakeTransaction.unit,
        baseQuantity: Number(track.intakeTransaction.baseQuantity),
        Bardana: track.intakeTransaction.Bardana ? Number(track.intakeTransaction.Bardana) : null,
        Khot: track.intakeTransaction.Khot ? Number(track.intakeTransaction.Khot) : null,
        netWeight: track.intakeTransaction.netWeight ? Number(track.intakeTransaction.netWeight) : null,
        notes: track.intakeTransaction.notes,
        status: track.intakeTransaction.status,
        createdAt: track.intakeTransaction.createdAt.toISOString(),
        updatedAt: track.intakeTransaction.updatedAt.toISOString(),
      } : null,
      product: track.product ? {
        id: track.product.id,
        name: track.product.name,
        category: track.product.category,
        primaryUnit: track.product.primaryUnit,
      } : null
    }));
  }
}
