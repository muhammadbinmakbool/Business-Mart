import { round } from "@/lib/financial";

export class SalesDraftBuilder {
  /**
   * Group unbilled tracks and direct sale history to synthesize prefilled drafts.
   */
  static buildSuggestedDrafts(unbilledTracks = [], activeIntakes = [], recentSales = []) {
    const draftsMap = new Map();

    // Helper to get or create buyer draft structure
    const getOrCreateDraft = (buyerId, buyerName, phone = "") => {
      if (!draftsMap.has(buyerId)) {
        draftsMap.set(buyerId, {
          buyerId,
          buyerName,
          phoneNumber: phone,
          items: []
        });
      }
      return draftsMap.get(buyerId);
    };

    // 1. Process Unbilled Mapped Tracks (100% confidence, Flow B track)
    for (const track of unbilledTracks) {
      if (!track.buyer) continue;
      
      const buyerId = track.buyer.id;
      const draft = getOrCreateDraft(buyerId, track.buyer.name, track.buyer.phoneNumber || "");

      const displayRate = track.sellingRate || track.buyingRate || 0;
      const displayWeight = track.netWeight !== null && track.netWeight !== undefined
        ? track.netWeight
        : (track.quantity || 0);

      const originalUnit = track.intakeTransaction?.unit || track.product?.primaryUnit || "KG";
      const originalRateUnit = track.rateUnit || track.intakeTransaction?.rateUnit || track.product?.primaryUnit || "KG";

      draft.items.push({
        id: `track-${track.id}`,
        salesTrackId: track.id,
        productId: track.productId,
        productName: track.product?.name || "Unknown Product",
        weight: displayWeight,
        rate: displayRate,
        unit: originalUnit,
        rateUnit: originalRateUnit,
        intakeNumber: track.intakeTransaction?.intakeNumber || null,
        isWeightRecorded: track.intakeTransaction ? track.intakeTransaction.isWeightRecorded : true,
        type: "TRACKED",
        confidence: 1.0,
        rationale: `Pending billing for Intake ${track.intakeTransaction?.intakeNumber || `#${track.intakeTransactionId}`}`
      });
    }

    // 2. Process Recent Direct Sales Activity for repeating patterns
    // Group direct sales by buyer and product
    const buyerPatterns = new Map(); // buyerId -> Map(productId -> Array of saleItems)

    for (const item of recentSales) {
      if (!item.sale || !item.sale.partyId) continue;
      
      const buyerId = item.sale.partyId;
      const productId = item.productId;

      if (!buyerPatterns.has(buyerId)) {
        buyerPatterns.set(buyerId, new Map());
      }
      const productMap = buyerPatterns.get(buyerId);
      if (!productMap.has(productId)) {
        productMap.set(productId, []);
      }
      productMap.get(productId).push(item);
    }

    // Generate direct suggestions based on purchase history
    for (const [buyerId, productMap] of buyerPatterns.entries()) {
      // Find buyer info from recentSales
      const firstItem = Array.from(productMap.values())[0]?.[0];
      if (!firstItem || !firstItem.sale || !firstItem.sale.party) continue;

      const buyerName = firstItem.sale.party.name;
      const draft = getOrCreateDraft(buyerId, buyerName, "");

      for (const [productId, items] of productMap.entries()) {
        // Skip if this product already has a pending unbilled track for this buyer
        // (to prevent double suggestions for the same product unless desired)
        const hasTrackedItem = draft.items.some(di => di.productId === productId && di.type === "TRACKED");
        if (hasTrackedItem) continue;

        const purchaseCount = items.length;
        const totalWeight = items.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
        const totalRate = items.reduce((sum, i) => sum + (Number(i.rate) || 0), 0);
        
        // Calculate average quantities and rates
        const avgWeight = purchaseCount > 0 ? round(totalWeight / purchaseCount) : 0;
        const avgRate = purchaseCount > 0 ? round(totalRate / purchaseCount) : 0;
        const sampleItem = items[0];

        // Determine confidence score and description based on purchase count
        let confidence = 0.60;
        let rationale = "Occasional direct buyer";
        if (purchaseCount >= 3) {
          confidence = 0.85;
          rationale = `Frequent buyer (${purchaseCount} direct purchases recently)`;
        } else if (purchaseCount >= 2) {
          confidence = 0.75;
          rationale = "Repeated direct buyer (2 purchases recently)";
        }

        draft.items.push({
          id: `direct-${buyerId}-${productId}`,
          salesTrackId: null,
          productId: productId,
          productName: sampleItem.product?.name || "Unknown Product",
          weight: avgWeight,
          rate: avgRate,
          unit: sampleItem.unit || sampleItem.product?.primaryUnit || "KG",
          rateUnit: sampleItem.rateUnit || sampleItem.product?.primaryUnit || "KG",
          intakeNumber: null,
          type: "DIRECT",
          confidence,
          rationale
        });
      }
    }

    return Array.from(draftsMap.values());
  }
}
