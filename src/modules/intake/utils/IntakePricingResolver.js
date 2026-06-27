import { prisma } from "@/lib/prisma";

const PURCHASE_HISTORY_LOOKBACK_DAYS = 60;

export class IntakePricingResolver {
  /**
   * Resolves the default rate and rate unit for a purchase intake transaction.
   * 
   * Source Precedence Order:
   * 1. SupplierProduct Master Data (Future Hook)
   * 2. Recent Supplier Purchase (Within last 60 days)
   * 3. Product Default Cost (Catalog baseline)
   * 4. Manual Entry (Fallback when empty)
   */
  static async resolvePurchaseCost(productId, partyId) {
    const parsedProductId = parseInt(productId);
    const parsedPartyId = parseInt(partyId);
    
    if (isNaN(parsedProductId)) {
      return { rate: null, rateUnit: "KG", prefillReason: "NONE" };
    }

    // 1. Future Hook: SupplierProduct specific master data (e.g. SupplierProduct.defaultCost)
    // Placeholder to make future additions a drop-in upgrade
    const supplierProductDefault = null; 
    if (supplierProductDefault) {
      // return supplierProductDefault;
    }

    // 2. Recent Supplier Purchase (Time-bound lookback)
    if (!isNaN(parsedPartyId)) {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - PURCHASE_HISTORY_LOOKBACK_DAYS);

      const lastIntake = await prisma.intakeTransaction.findFirst({
        where: {
          productId: parsedProductId,
          partyId: parsedPartyId,
          isDeleted: false,
          entryDate: { gte: sixtyDaysAgo },
          rate: { not: null }
        },
        orderBy: [
          { entryDate: "desc" },
          { id: "desc" }
        ],
        select: {
          rate: true,
          rateUnit: true
        }
      });

      if (lastIntake && lastIntake.rate) {
        return {
          rate: Number(lastIntake.rate),
          rateUnit: lastIntake.rateUnit,
          prefillReason: "LAST_PURCHASE"
        };
      }
    }

    // 3. Product Default Cost (Fallback from Product Master)
    const product = await prisma.product.findUnique({
      where: { id: parsedProductId },
      select: {
        defaultBuyingRate: true,
        buyingRateUnit: true,
        primaryUnit: true
      }
    });

    if (product && product.defaultBuyingRate !== null) {
      return {
        rate: Number(product.defaultBuyingRate),
        rateUnit: product.buyingRateUnit || product.primaryUnit || "KG",
        prefillReason: "PRODUCT_DEFAULT"
      };
    }

    // 4. Fallback: Manual Entry Required (Empty)
    return {
      rate: null,
      rateUnit: product?.primaryUnit || "KG",
      prefillReason: "NONE"
    };
  }
}
