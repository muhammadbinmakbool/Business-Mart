"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Retrieves the invoice adjustment visibility settings from the database.
 * Returns a fallback/default empty settings object if the record doesn't exist.
 */
export async function getAdjustmentVisibilityAction() {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: "adjustment_visibility" }
    });
    
    return {
      success: true,
      settings: record ? JSON.parse(record.value) : { adjustmentVisibility: {} }
    };
  } catch (error) {
    console.error("Failed to load adjustment visibility settings:", error);
    return {
      success: false,
      error: error.message || "Failed to load settings from database"
    };
  }
}

/**
 * Saves/Upserts the invoice adjustment visibility settings in the database.
 * @param {object} adjustmentVisibility - The visibility map (e.g. { COMMISSION: true, RENT: false })
 */
export async function saveAdjustmentVisibilityAction(adjustmentVisibility) {
  try {
    const settingsValue = JSON.stringify({ adjustmentVisibility });
    
    await prisma.systemSetting.upsert({
      where: { key: "adjustment_visibility" },
      update: { value: settingsValue },
      create: { key: "adjustment_visibility", value: settingsValue }
    });
    
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to save adjustment visibility settings:", error);
    return {
      success: false,
      error: error.message || "Failed to save settings to database"
    };
  }
}
