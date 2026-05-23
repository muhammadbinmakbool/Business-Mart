import { prisma } from "@/lib/prisma";

export class MarketInsightRepository {
  /**
   * ProductRate = market reference history only
   * Strict Rule: Observational only. Must NEVER mutate stock or financial ledger data.
   */
  static serializeRate(r) {
    if (!r) return null;
    return {
      ...r,
      rate: r.rate ? Number(r.rate) : 0,
      product: r.product ? {
        id: r.product.id,
        name: r.product.name,
        category: r.product.category,
        primaryUnit: r.product.primaryUnit,
        unitConversion: r.product.unitConversion ? Number(r.product.unitConversion) : null,
      } : null
    };
  }

  static async create(data) {
    const rate = await prisma.productRate.create({
      data,
      include: { product: true }
    });
    return this.serializeRate(rate);
  }

  static async getAll(filter = "ACTIVE") {
    let whereClause = {};
    if (filter === "ACTIVE") {
      whereClause = { isDeleted: false };
    } else if (filter === "ARCHIVED") {
      whereClause = { isDeleted: true };
    }

    const rates = await prisma.productRate.findMany({
      where: whereClause,
      include: { product: true },
      orderBy: { date: "desc" }
    });
    return rates.map(r => this.serializeRate(r));
  }

  static async getHistory(productId, startDate, endDate) {
    const rates = await prisma.productRate.findMany({
      where: {
        productId: parseInt(productId),
        isDeleted: false,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: { product: true },
      orderBy: { date: "asc" }
    });
    return rates.map(r => this.serializeRate(r));
  }

  static async archiveRate(id) {
    const r = await prisma.productRate.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true },
      include: { product: true }
    });
    return this.serializeRate(r);
  }

  /**
   * Get raw records for visual trend counting.
   * Only reads counts of events, never financial aggregates or ledger records.
   */
  static async getRawActivityEvents(startDate, endDate) {
    const intakes = await prisma.intakeTransaction.findMany({
      where: {
        entryDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        entryDate: true,
        productId: true
      }
    });

    const sales = await prisma.saleTransaction.findMany({
      where: {
        isDeleted: false,
        entryDate: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        entryDate: true
      }
    });

    return {
      intakes,
      sales
    };
  }
}
