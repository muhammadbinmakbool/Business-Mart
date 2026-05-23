"use server";

import { MarketInsightService } from "../services/MarketInsightService";
import { revalidatePath } from "next/cache";

export async function createRateAction(formData) {
  const data = {
    productId: formData.get("productId") ? parseInt(formData.get("productId")) : null,
    rate: formData.get("rate") ? parseFloat(formData.get("rate")) : null,
    unit: formData.get("unit") || null,
    source: formData.get("source") || null,
    notes: formData.get("notes") || null,
    createdBy: formData.get("createdBy") || "System Admin",
    date: formData.get("date") ? new Date(formData.get("date")) : new Date()
  };

  try {
    await MarketInsightService.recordRate(data);
    revalidatePath("/market-insight");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to record rate" };
  }
}

export async function archiveRateAction(id) {
  try {
    await MarketInsightService.archiveRateEntry(id);
    revalidatePath("/market-insight");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to archive rate" };
  }
}
