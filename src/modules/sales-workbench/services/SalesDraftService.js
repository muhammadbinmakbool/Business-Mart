import { SalesDraftDataProvider } from "./SalesDraftDataProvider";
import { SalesDraftBuilder } from "./SalesDraftBuilder";

/**
 * SalesDraftService acts as the single source of truth for generating suggested draft invoices.
 */
export class SalesDraftService {
  /**
   * Fetch data for all buyers and build all suggested drafts (for Workbench dashboard).
   */
  static async getAllSuggestedDrafts() {
    const [unbilledTracks, activeIntakes, recentSales] = await Promise.all([
      SalesDraftDataProvider.fetchUnbilledTracks(),
      SalesDraftDataProvider.fetchActiveIntakes(),
      SalesDraftDataProvider.fetchRecentSales()
    ]);

    return SalesDraftBuilder.buildSuggestedDrafts(unbilledTracks, activeIntakes, recentSales);
  }

  /**
   * Fetch data only for the given buyerId and build exactly one suggested draft (for Create Sale / POS forms).
   */
  static async buildDraftForBuyer(buyerId) {
    if (!buyerId) return null;
    
    const [unbilledTracks, recentSales] = await Promise.all([
      SalesDraftDataProvider.fetchUnbilledTracks(buyerId),
      SalesDraftDataProvider.fetchRecentSales(buyerId)
    ]);

    const drafts = SalesDraftBuilder.buildSuggestedDrafts(unbilledTracks, [], recentSales);
    return drafts.find(d => d.buyerId.toString() === buyerId.toString()) || null;
  }
}
