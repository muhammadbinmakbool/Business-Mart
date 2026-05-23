import { MarketInsightRepository } from "../repositories/MarketInsightRepository";
import { marketInsightSchema } from "../validations/marketInsightSchema";
import { prisma } from "@/lib/prisma";

export class MarketInsightService {
  /**
   * ProductRate = market reference history only
   * Strict Rules:
   * 1. Observational only. Must NEVER mutate stock counts, inventory values, or ledger balances.
   * 2. Historical values are snapshots and must NEVER be recalculated from transactional data after creation.
   */

  static async recordRate(data) {
    // 1. Fetch product to establish default unit if not provided
    const product = await prisma.product.findUnique({
      where: { id: parseInt(data.productId) }
    });
    if (!product) {
      throw new Error(`Product with ID ${data.productId} does not exist`);
    }

    // 2. Fallback to product primary unit or "KG"
    const unit = data.unit || product.primaryUnit || "KG";

    // 3. Validate entry using Zod schema
    const validated = marketInsightSchema.parse({
      ...data,
      unit
    });

    // 4. Save to database
    return await MarketInsightRepository.create(validated);
  }

  static async listRates(filter = "ACTIVE") {
    return await MarketInsightRepository.getAll(filter);
  }

  static async archiveRateEntry(id) {
    return await MarketInsightRepository.archiveRate(id);
  }

  static async getRateHistory(productId, period = "30d") {
    const { start, end } = this.calculateDateRange(period);
    return await MarketInsightRepository.getHistory(productId, start, end);
  }

  static async getAnalytics(period = "30d", productId = null) {
    const { start, end } = this.calculateDateRange(period);

    // 1. Fetch raw transaction event counts (Intake/Sale counts)
    const { intakes, sales } = await MarketInsightRepository.getRawActivityEvents(start, end);

    // 2. Fetch price trend history (grouped by product or filtered by a specific product)
    let priceHistory = [];
    if (productId) {
      priceHistory = await MarketInsightRepository.getHistory(productId, start, end);
    } else {
      // Fetch all price history for the period
      const rates = await prisma.productRate.findMany({
        where: {
          isDeleted: false,
          date: { gte: start, lte: end }
        },
        include: { product: true },
        orderBy: { date: "asc" }
      });
      priceHistory = rates.map(r => MarketInsightRepository.serializeRate(r));
    }

    // 3. Build time-series aggregates for charts
    const dateMap = {};
    const daysCount = period === "7d" ? 7 : period === "90d" ? 90 : 30;

    for (let i = 0; i < daysCount; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (daysCount - 1 - i));
      const dateStr = d.toISOString().split("T")[0];
      dateMap[dateStr] = {
        date: dateStr,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        intakesCount: 0,
        salesCount: 0,
        rates: {} // Map product IDs/names to rate
      };
    }

    // Group Intake counts by date
    intakes.forEach(item => {
      const dateStr = new Date(item.entryDate).toISOString().split("T")[0];
      if (dateMap[dateStr]) {
        dateMap[dateStr].intakesCount += 1;
      }
    });

    // Group Sale counts by date
    sales.forEach(item => {
      const dateStr = new Date(item.entryDate).toISOString().split("T")[0];
      if (dateMap[dateStr]) {
        dateMap[dateStr].salesCount += 1;
      }
    });

    // Map Rates to date slots
    priceHistory.forEach(item => {
      const dateStr = new Date(item.date).toISOString().split("T")[0];
      if (dateMap[dateStr]) {
        const prodName = item.product?.name || `Prod ${item.productId}`;
        dateMap[dateStr].rates[prodName] = item.rate;
      }
    });

    return Object.values(dateMap);
  }

  static calculateDateRange(period) {
    const end = new Date();
    // Normalize end to end of today
    end.setHours(23, 59, 59, 999);

    const start = new Date();
    // Normalize start to beginning of day
    start.setHours(0, 0, 0, 0);

    if (period === "7d") {
      start.setDate(start.getDate() - 6);
    } else if (period === "90d") {
      start.setDate(start.getDate() - 89);
    } else {
      // Default to 30d
      start.setDate(start.getDate() - 29);
    }

    return { start, end };
  }
}
