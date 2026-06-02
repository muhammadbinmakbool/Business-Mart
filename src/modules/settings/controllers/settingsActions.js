"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import { storeFile, deleteFile } from "@/lib/fileStorage";

export async function getSettings() {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: "adjustment_visibility" }
    });
    
    if (!record) {
      return {
        adjustments: { visibility: {} },
        defaults: { productId: null, activeMarketProductId: null }
      };
    }
    
    const parsed = JSON.parse(record.value);
    
    // Normalization and migration for nested adjustments visibility
    const adjustments = parsed.adjustments || {};
    if (!adjustments.visibility) {
      adjustments.visibility = parsed.adjustmentVisibility || {};
    }
    
    const defaults = parsed.defaults || { productId: null, activeMarketProductId: null };
    
    return {
      adjustments,
      defaults
    };
  } catch (error) {
    console.error("Failed to load settings in getSettings server action:", error);
    return {
      adjustments: { visibility: {} },
      defaults: { productId: null, activeMarketProductId: null }
    };
  }
}

export async function updateSettings(settings) {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: "adjustment_visibility" }
    });
    
    let parsed = {};
    if (record) {
      try {
        parsed = JSON.parse(record.value);
      } catch (e) {
        console.error("Failed to parse existing settings JSON:", e);
      }
    }
    
    // Normalize existing format
    if (!parsed.adjustments) parsed.adjustments = {};
    if (!parsed.adjustments.visibility && parsed.adjustmentVisibility) {
      parsed.adjustments.visibility = parsed.adjustmentVisibility;
    }
    if (!parsed.defaults) parsed.defaults = { productId: null, activeMarketProductId: null };
    
    // Apply updates
    if (settings.adjustments) {
      parsed.adjustments = {
        ...parsed.adjustments,
        ...settings.adjustments,
        visibility: {
          ...(parsed.adjustments.visibility || {}),
          ...(settings.adjustments.visibility || {})
        }
      };
      // Keep root field in sync for old code/queries
      parsed.adjustmentVisibility = parsed.adjustments.visibility;
    }
    
    if (settings.defaults) {
      parsed.defaults = {
        ...parsed.defaults,
        ...settings.defaults
      };
    }
    
    const settingsValue = JSON.stringify(parsed);
    
    await prisma.systemSetting.upsert({
      where: { key: "adjustment_visibility" },
      update: { value: settingsValue },
      create: { key: "adjustment_visibility", value: settingsValue }
    });
    
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to save settings in updateSettings server action:", error);
    return { success: false, error: error.message || "Failed to save settings" };
  }
}

/**
 * Retrieves the invoice adjustment visibility settings from the database.
 * Legacy wrapper: delegates to getSettings() but matches old output format.
 */
export async function getAdjustmentVisibilityAction() {
  try {
    const settings = await getSettings();
    return {
      success: true,
      settings: {
        adjustmentVisibility: settings.adjustments.visibility,
        // Include default and season fields at root for backward compatibility with pages fetching settings
        defaultProductId: settings.defaults.productId,
        currentSeasonProductId: settings.defaults.activeMarketProductId,
        ...settings
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Saves/Upserts the invoice adjustment visibility settings in the database.
 * Legacy wrapper: delegates to updateSettings().
 */
export async function saveAdjustmentVisibilityAction(adjustmentVisibility) {
  return await updateSettings({
    adjustments: { visibility: adjustmentVisibility }
  });
}

/**
 * Saves the default product and active market product settings.
 */
export async function saveDefaultProductSettingsAction(defaultProductId, activeMarketProductId) {
  return await updateSettings({
    defaults: {
      productId: defaultProductId ? parseInt(defaultProductId) : null,
      activeMarketProductId: activeMarketProductId ? parseInt(activeMarketProductId) : null
    }
  });
}

const DEFAULT_PRINT_SETTINGS = {
  defaultTemplate: "STANDARD",
  paperSize: "A4",
  orientation: "PORTRAIT",
  showLogo: true,
  showWatermark: false,
  showSignatures: true,
  showDuplicateLabel: true,
  footerNotes: "",
  defaultCurrency: "Rs.",
  autoPrintAfterSave: false
};

/**
 * Retrieves print settings from database
 */
export async function getPrintSettingsAction() {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: "print_settings" }
    });
    
    if (!record) {
      return { success: true, settings: DEFAULT_PRINT_SETTINGS };
    }
    
    const parsed = JSON.parse(record.value);
    return {
      success: true,
      settings: {
        ...DEFAULT_PRINT_SETTINGS,
        ...parsed
      }
    };
  } catch (error) {
    console.error("Failed to load settings in getPrintSettingsAction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Saves/Upserts print settings in database
 */
export async function savePrintSettingsAction(printSettings) {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: "print_settings" }
    });
    
    let parsed = {};
    if (record) {
      try {
        parsed = JSON.parse(record.value);
      } catch (e) {
        console.error("Failed to parse existing print settings JSON:", e);
      }
    }
    
    const updated = {
      ...DEFAULT_PRINT_SETTINGS,
      ...parsed,
      ...printSettings
    };
    
    const settingsValue = JSON.stringify(updated);
    
    await prisma.systemSetting.upsert({
      where: { key: "print_settings" },
      update: { value: settingsValue },
      create: { key: "print_settings", value: settingsValue }
    });
    
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to save settings in savePrintSettingsAction:", error);
    return { success: false, error: error.message || "Failed to save print settings" };
  }
}

const DEFAULT_GENERAL_SETTINGS = {
  businessName: "Rehmania & Company",
  businessShortName: "R&C",
  phoneNumber: "0301-6782024",
  businessEmail: "info@rehmania-grain.com",
  address: "Grain Market, Rahim Yar Khan, Punjab, Pakistan",
  logoPath: "",
  currencyCode: "PKR",
  currencySymbol: "Rs.",
  defaultLanguage: "en",
  timezone: "Asia/Karachi",
  dateFormat: "DD/MM/YYYY",
  decimalPlaces: 2
};

/**
 * Retrieves the general system settings from the database.
 */
export async function getGeneralSettingsAction() {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: "general_settings" }
    });

    if (!record) {
      return { success: true, settings: DEFAULT_GENERAL_SETTINGS };
    }

    const parsed = JSON.parse(record.value);
    return {
      success: true,
      settings: {
        ...DEFAULT_GENERAL_SETTINGS,
        ...parsed
      }
    };
  } catch (error) {
    console.error("Failed to load general settings:", error);
    return { success: false, error: error.message || "Failed to load general settings" };
  }
}

/**
 * Saves/Upserts the general system settings in the database.
 */
export async function saveGeneralSettingsAction(settings) {
  try {
    if (!settings || !settings.businessName || !settings.businessName.trim()) {
      return { success: false, error: "Business Name is required" };
    }

    const record = await prisma.systemSetting.findUnique({
      where: { key: "general_settings" }
    });

    let parsed = {};
    if (record) {
      try {
        parsed = JSON.parse(record.value);
        
        // Overwrite/cleanup old logo from filesystem if replaced
        if (parsed.logoPath && parsed.logoPath !== settings.logoPath) {
          await deleteFile(parsed.logoPath);
        }
      } catch (e) {
        console.error("Failed to parse existing general settings or clean old logo:", e);
      }
    }

    const updated = {
      ...DEFAULT_GENERAL_SETTINGS,
      ...parsed,
      ...settings,
      // Ensure specific types
      decimalPlaces: settings.decimalPlaces !== undefined ? parseInt(settings.decimalPlaces) : (parsed.decimalPlaces || 2)
    };

    const settingsValue = JSON.stringify(updated);

    await prisma.systemSetting.upsert({
      where: { key: "general_settings" },
      update: { value: settingsValue },
      create: { key: "general_settings", value: settingsValue }
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to save general settings:", error);
    return { success: false, error: error.message || "Failed to save general settings" };
  }
}

/**
 * Handles logo file upload and saves it to local disk via fileStorage abstraction.
 */
export async function uploadLogoAction(formData) {
  try {
    const file = formData.get("logo");
    if (!file || typeof file === "string") {
      return { success: false, error: "No file uploaded" };
    }

    const logoPath = await storeFile(file, "logo");
    return { success: true, logoPath };
  } catch (error) {
    console.error("Failed to upload company logo:", error);
    return { success: false, error: error.message || "Failed to upload logo file" };
  }
}




