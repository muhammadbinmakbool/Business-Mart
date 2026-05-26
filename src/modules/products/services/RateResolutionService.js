import { prisma } from "@/lib/prisma";

/**
 * Service to resolve rate fallbacks for products without N+1 query loops.
 * Employs a session-scoped in-memory cache active during query requests.
 */
export class RateResolutionService {
  static _cache = null;

  /**
   * Initializes the session-scoped rate cache.
   */
  static startSession() {
    this._cache = new Map();
  }

  /**
   * Tears down the session-scoped cache to release memory.
   */
  static endSession() {
    this._cache = null;
  }

  /**
   * Resolves the rate of a product using standard ERP chronological fallbacks:
   * 1. Check current session cache.
   * 2. Find the latest recorded rate from non-cancelled, non-null IntakeTransactions for this product.
   * 3. Fallback to the latest active ProductRate market log for this product.
   * 4. Return 0 if absolutely no rate records are available.
   *
   * @param {number} productId - The ID of the product
   * @returns {Promise<number>} - Resolved rate value
   */
  static async resolveRate(productId) {
    const pId = parseInt(productId);
    if (isNaN(pId)) return 0;

    // 1. Session Cache Match
    if (this._cache && this._cache.has(pId)) {
      return this._cache.get(pId);
    }

    let resolvedRate = 0;

    try {
      // 2. Resolve from latest active Intake Transaction
      const latestIntake = await prisma.intakeTransaction.findFirst({
        where: {
          productId: pId,
          rate: { not: null, gt: 0 },
          status: { not: "CANCELLED" }
        },
        orderBy: {
          entryDate: "desc"
        }
      });

      if (latestIntake && latestIntake.rate) {
        resolvedRate = Number(latestIntake.rate);
      } else {
        // 3. Fallback to latest ProductRate active reference
        const latestProductRate = await prisma.productRate.findFirst({
          where: {
            productId: pId,
            rate: { gt: 0 },
            isDeleted: false
          },
          orderBy: {
            date: "desc"
          }
        });
        if (latestProductRate && latestProductRate.rate) {
          resolvedRate = Number(latestProductRate.rate);
        }
      }
    } catch (err) {
      console.error(`[RateResolutionService] Error resolving rate for product ${pId}:`, err);
    }

    // Cache the resolved result for the remainder of the session
    if (this._cache) {
      this._cache.set(pId, resolvedRate);
    }

    return resolvedRate;
  }
}
