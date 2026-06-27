"use server";

import { revalidatePath } from "next/cache";

/**
 * Server Action to record a purchase transaction.
 * In Phase 1, we validate and log the payload, returning a mock ID
 * to redirect to the success placeholder without blocking on DB schema normalization.
 */
export async function createPurchaseAction(payload) {
  try {
    // 1. Basic validation
    if (!payload.partyId) {
      return { success: false, error: "Supplier Party is required." };
    }
    if (!payload.entryDate) {
      return { success: false, error: "Date is required." };
    }
    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: "At least one item is required." };
    }

    for (const item of payload.items) {
      if (!item.productId) {
        return { success: false, error: "All items must have a product selected." };
      }
      if (!item.weight || Number(item.weight) <= 0) {
        return { success: false, error: "All items must have a valid quantity/weight." };
      }
      if (!item.rate || Number(item.rate) <= 0) {
        return { success: false, error: "All items must have a valid rate." };
      }
      if (!item.unit) {
        return { success: false, error: "All items must have a unit." };
      }
    }

    // Log the payload to server console for auditing during development
    console.log("=== PHASE 1 PURCHASE CREATED ===");
    console.log("Header:", payload.header);
    console.log("Items:", payload.items);
    console.log("Settlement:", payload.settlement);
    console.log("Totals:", payload.totals);
    console.log("================================");

    // Generate a mock ID
    const purchaseId = `PUR-${Date.now().toString().slice(-6)}`;

    revalidatePath("/purchases");
    return { success: true, data: { id: purchaseId } };
  } catch (error) {
    console.error("Failed to create purchase:", error);
    return { success: false, error: error.message };
  }
}
