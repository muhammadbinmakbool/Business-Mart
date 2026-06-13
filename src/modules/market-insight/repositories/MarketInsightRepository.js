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

  static async getRawActivityEvents(startDate, endDate) {
    const isSqlite = process.env.DB_PROVIDER === "sqlite";
    let intakesResult = [];
    let salesResult = [];

    if (isSqlite) {
      intakesResult = await prisma.$queryRaw`
        SELECT strftime('%Y-%m-%d', datetime(entryDate / 1000, 'unixepoch')) AS dateStr, COUNT(*) AS count
        FROM IntakeTransaction
        WHERE entryDate >= ${startDate.getTime()} AND entryDate <= ${endDate.getTime()}
        GROUP BY dateStr
      `;
      salesResult = await prisma.$queryRaw`
        SELECT strftime('%Y-%m-%d', datetime(entryDate / 1000, 'unixepoch')) AS dateStr, COUNT(*) AS count
        FROM SaleTransaction
        WHERE isDeleted = 0 AND entryDate >= ${startDate.getTime()} AND entryDate <= ${endDate.getTime()}
        GROUP BY dateStr
      `;
    } else {
      intakesResult = await prisma.$queryRaw`
        SELECT CONVERT(VARCHAR(10), entryDate, 120) AS dateStr, COUNT(*) AS count
        FROM IntakeTransaction
        WHERE entryDate >= ${startDate} AND entryDate <= ${endDate}
        GROUP BY CONVERT(VARCHAR(10), entryDate, 120)
      `;
      salesResult = await prisma.$queryRaw`
        SELECT CONVERT(VARCHAR(10), entryDate, 120) AS dateStr, COUNT(*) AS count
        FROM SaleTransaction
        WHERE isDeleted = 0 AND entryDate >= ${startDate} AND entryDate <= ${endDate}
        GROUP BY CONVERT(VARCHAR(10), entryDate, 120)
      `;
    }

    const intakesDaily = {};
    intakesResult.forEach(item => {
      intakesDaily[item.dateStr] = Number(item.count || 0);
    });

    const salesDaily = {};
    salesResult.forEach(item => {
      salesDaily[item.dateStr] = Number(item.count || 0);
    });

    return {
      intakesDaily,
      salesDaily
    };
  }
}
