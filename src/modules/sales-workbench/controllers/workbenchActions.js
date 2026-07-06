"use server";

import { SalesDraftService } from "../services/SalesDraftService";
import { ApplicationLogger } from "@/lib/logger";

/**
 * Exposes a Server Action to retrieve draft suggestions for a single buyer.
 * Used directly by the client-side Sales creation and POS forms.
 */
export async function getBuyerDraftSuggestionAction(buyerId) {
  try {
    if (!buyerId) {
      return { success: true, draft: null };
    }
    const draft = await SalesDraftService.buildDraftForBuyer(buyerId);
    return { success: true, draft };
  } catch (error) {
    ApplicationLogger.error("Error in getBuyerDraftSuggestionAction Server Action", error);
    return { success: false, error: error.message || "Failed to build draft suggestions." };
  }
}
