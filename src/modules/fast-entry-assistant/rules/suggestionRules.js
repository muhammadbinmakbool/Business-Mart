import { fastEntryMemoryStore } from "@/lib/fastEntryMemoryStore";

/**
 * Calculates smart suggestions based on form context and current values.
 * Strictly respects the priority hierarchy:
 * 1. Current Form Context (preceding rows for Sales)
 * 2. Phase 3 Memory Store (last-used values)
 */
export function getSuggestions(params) {
  const { context, partyId, productId, items = [], index = 0 } = params;

  const suggestions = {
    party: null,
    product: null,
    unit: null,
    rate: null
  };

  // 1. Resolve Party (Supplier/Buyer) suggestion from Memory Store
  if (context === "intake") {
    suggestions.party = fastEntryMemoryStore.getLastValue("lastSupplier", "intake");
    suggestions.product = fastEntryMemoryStore.getLastValue("lastProduct", "intake");
    suggestions.unit = fastEntryMemoryStore.getLastValue("lastUnit", "intake");
  } else if (context === "sales") {
    suggestions.party = fastEntryMemoryStore.getLastValue("lastBuyer", "sales");

    // Sales item-specific rules (Row context takes priority over global memory)
    if (index > 0 && items[index - 1]) {
      const prevRow = items[index - 1];
      suggestions.product = prevRow.productId || fastEntryMemoryStore.getLastValue("lastProduct", "sales");
      suggestions.unit = prevRow.unit || fastEntryMemoryStore.getLastValue("lastUnit", "sales");
      suggestions.rate = prevRow.rate || fastEntryMemoryStore.getLastValue("lastRate", "sales");
    } else {
      // First row uses global memory store defaults
      suggestions.product = fastEntryMemoryStore.getLastValue("lastProduct", "sales");
      suggestions.unit = fastEntryMemoryStore.getLastValue("lastUnit", "sales");
      suggestions.rate = fastEntryMemoryStore.getLastValue("lastRate", "sales");
    }
  }

  return suggestions;
}
