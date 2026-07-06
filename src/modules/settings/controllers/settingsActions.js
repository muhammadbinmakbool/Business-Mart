"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import { storeFile, deleteFile } from "@/lib/fileStorage";
import { getInventorySettings, DEFAULT_INVENTORY_SETTINGS } from "@/lib/settings/inventorySettings";
import { getSettlementLedgerSettings, DEFAULT_SETTLEMENT_LEDGER_SETTINGS } from "@/lib/settings/settlementLedgerSettings";
import { getActivityAuditSettings, DEFAULT_ACTIVITY_AUDIT_SETTINGS } from "@/lib/settings/activityAuditSettings";
import { WorkflowSettingsProvider, DEFAULT_INTAKE_WORKFLOW_SETTINGS } from "@/modules/workflow/core/WorkflowSettingsProvider";
import { withSecurity } from "@/lib/authGuard";
import { getSession } from "@/lib/session";
import { ApplicationLogger } from "@/lib/logger";


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
    ApplicationLogger.error("Failed to load settings in getSettings server action", error);
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
        ApplicationLogger.error("Failed to parse existing settings JSON", e);
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
    ApplicationLogger.error("Failed to save settings in updateSettings server action", error);
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
    ApplicationLogger.error("Failed to load settings in getPrintSettingsAction", error);
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
        ApplicationLogger.error("Failed to parse existing print settings JSON", e);
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
    ApplicationLogger.error("Failed to save settings in savePrintSettingsAction", error);
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
  decimalPlaces: 2,
  showFastEntryHelper: true,
  unitDisplayPrecision: 2,
  unitLabelFormat: "short"
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
    ApplicationLogger.error("Failed to load general settings", error);
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
        ApplicationLogger.error("Failed to parse existing general settings or clean old logo", e);
      }
    }

    const updated = {
      ...DEFAULT_GENERAL_SETTINGS,
      ...parsed,
      ...settings,
      // Ensure specific types
      decimalPlaces: settings.decimalPlaces !== undefined ? parseInt(settings.decimalPlaces) : (parsed.decimalPlaces || 2),
      showFastEntryHelper: settings.showFastEntryHelper !== undefined ? !!settings.showFastEntryHelper : (parsed.showFastEntryHelper !== undefined ? !!parsed.showFastEntryHelper : true),
      unitDisplayPrecision: settings.unitDisplayPrecision !== undefined ? parseInt(settings.unitDisplayPrecision) : (parsed.unitDisplayPrecision !== undefined ? parseInt(parsed.unitDisplayPrecision) : 2),
      unitLabelFormat: settings.unitLabelFormat !== undefined ? String(settings.unitLabelFormat) : (parsed.unitLabelFormat || "short")
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
    ApplicationLogger.error("Failed to save general settings", error);
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
    ApplicationLogger.error("Failed to upload company logo", error);
    return { success: false, error: error.message || "Failed to upload logo file" };
  }
}

/**
 * Action to fetch inventory settings.
 */
export async function getInventorySettingsAction() {
  try {
    const settings = await getInventorySettings();
    return { success: true, settings };
  } catch (error) {
    ApplicationLogger.error("Failed to get inventory settings action", error);
    return { success: false, error: error.message || "Failed to fetch inventory settings" };
  }
}

/**
 * Action to save inventory settings.
 */
export async function saveInventorySettingsAction(settings) {
  try {
    if (!settings || typeof settings !== "object") {
      return { success: false, error: "Invalid settings data" };
    }

    // Build standard structure to filter out arbitrary fields
    const updated = {
      negativeStockAllowed: settings.negativeStockAllowed !== undefined ? !!settings.negativeStockAllowed : DEFAULT_INVENTORY_SETTINGS.negativeStockAllowed,
      autoNormalizeUnits: settings.autoNormalizeUnits !== undefined ? !!settings.autoNormalizeUnits : DEFAULT_INVENTORY_SETTINGS.autoNormalizeUnits,
      inventorySnapshotFrequency: settings.inventorySnapshotFrequency || DEFAULT_INVENTORY_SETTINGS.inventorySnapshotFrequency,
      lowStockThreshold: settings.lowStockThreshold !== undefined ? parseInt(settings.lowStockThreshold, 10) : DEFAULT_INVENTORY_SETTINGS.lowStockThreshold,
      lowStockAlertEnabled: settings.lowStockAlertEnabled !== undefined ? !!settings.lowStockAlertEnabled : DEFAULT_INVENTORY_SETTINGS.lowStockAlertEnabled,
      showOnlyActiveProducts: settings.showOnlyActiveProducts !== undefined ? !!settings.showOnlyActiveProducts : DEFAULT_INVENTORY_SETTINGS.showOnlyActiveProducts
    };

    if (isNaN(updated.lowStockThreshold) || updated.lowStockThreshold < 0) {
      return { success: false, error: "Low stock threshold must be a non-negative number" };
    }

    const settingsValue = JSON.stringify(updated);

    await prisma.systemSetting.upsert({
      where: { key: "inventory_settings" },
      update: { value: settingsValue },
      create: { key: "inventory_settings", value: settingsValue }
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    ApplicationLogger.error("Failed to save inventory settings action", error);
    return { success: false, error: error.message || "Failed to save inventory settings" };
  }
}

/**
 * Action to fetch settlement & ledger settings.
 */
export async function getSettlementLedgerSettingsAction() {
  try {
    const settings = await getSettlementLedgerSettings();
    return { success: true, settings };
  } catch (error) {
    ApplicationLogger.error("Failed to get settlement & ledger settings action", error);
    return { success: false, error: error.message || "Failed to fetch settlement & ledger settings" };
  }
}

/**
 * Action to save settlement & ledger settings.
 */
export async function saveSettlementLedgerSettingsAction(settings) {
  try {
    if (!settings || typeof settings !== "object") {
      return { success: false, error: "Invalid settings data" };
    }

    // Build standard structure to filter out arbitrary fields
    const updated = {
      reconciliationTolerance: settings.reconciliationTolerance !== undefined ? parseFloat(settings.reconciliationTolerance) : DEFAULT_SETTLEMENT_LEDGER_SETTINGS.reconciliationTolerance,
      autoMarkOutdatedInvoices: settings.autoMarkOutdatedInvoices !== undefined ? !!settings.autoMarkOutdatedInvoices : DEFAULT_SETTLEMENT_LEDGER_SETTINGS.autoMarkOutdatedInvoices,
      requireConfirmationBeforeRegeneration: settings.requireConfirmationBeforeRegeneration !== undefined ? !!settings.requireConfirmationBeforeRegeneration : DEFAULT_SETTLEMENT_LEDGER_SETTINGS.requireConfirmationBeforeRegeneration
    };

    if (isNaN(updated.reconciliationTolerance) || updated.reconciliationTolerance < 0) {
      return { success: false, error: "Reconciliation tolerance must be a non-negative number" };
    }

    const settingsValue = JSON.stringify(updated);

    await prisma.systemSetting.upsert({
      where: { key: "settlement_ledger_settings" },
      update: { value: settingsValue },
      create: { key: "settlement_ledger_settings", value: settingsValue }
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    ApplicationLogger.error("Failed to save settlement & ledger settings action", error);
    return { success: false, error: error.message || "Failed to save settlement & ledger settings" };
  }
}

/**
 * Action to fetch activity & audit settings.
 */
export async function getActivityAuditSettingsAction() {
  try {
    const settings = await getActivityAuditSettings();
    return { success: true, settings };
  } catch (error) {
    ApplicationLogger.error("Failed to get activity & audit settings action", error);
    return { success: false, error: error.message || "Failed to fetch activity & audit settings" };
  }
}

/**
 * Action to save activity & audit settings.
 */
export async function saveActivityAuditSettingsAction(settings) {
  try {
    if (!settings || typeof settings !== "object") {
      return { success: false, error: "Invalid settings data" };
    }

    const logRetentionDays = parseInt(settings.logRetentionDays, 10);
    if (isNaN(logRetentionDays) || logRetentionDays < 0) {
      return { success: false, error: "Log retention days must be a non-negative number" };
    }

    // Build standard structure to filter out arbitrary fields
    const updated = {
      logRetentionDays,
      trackEdits: settings.trackEdits !== undefined ? !!settings.trackEdits : DEFAULT_ACTIVITY_AUDIT_SETTINGS.trackEdits,
      showDeletedRecords: settings.showDeletedRecords !== undefined ? !!settings.showDeletedRecords : DEFAULT_ACTIVITY_AUDIT_SETTINGS.showDeletedRecords,
      allowDestructiveDelete: settings.allowDestructiveDelete !== undefined ? !!settings.allowDestructiveDelete : DEFAULT_ACTIVITY_AUDIT_SETTINGS.allowDestructiveDelete
    };

    const settingsValue = JSON.stringify(updated);

    await prisma.systemSetting.upsert({
      where: { key: "activity_audit_settings" },
      update: { value: settingsValue },
      create: { key: "activity_audit_settings", value: settingsValue }
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    ApplicationLogger.error("Failed to save activity & audit settings action", error);
    return { success: false, error: error.message || "Failed to save activity & audit settings" };
  }
}

/**
 * Action to fetch intake workflow settings.
 */
export async function getIntakeWorkflowSettingsAction() {
  try {
    const settings = await WorkflowSettingsProvider.loadSettings();
    return { success: true, settings };
  } catch (error) {
    ApplicationLogger.error("Failed to get intake workflow settings action", error);
    return { success: false, error: error.message || "Failed to fetch intake workflow settings" };
  }
}

/**
 * Action to save intake workflow settings.
 */
export async function saveIntakeWorkflowSettingsAction(settings) {
  try {
    if (!settings || typeof settings !== "object") {
      return { success: false, error: "Invalid settings data" };
    }

    const defaultIntakeStatus = settings.defaultIntakeStatus;
    if (defaultIntakeStatus !== "PENDING" && defaultIntakeStatus !== "COMPLETED") {
      return { success: false, error: "Default status must be PENDING or COMPLETED" };
    }

    // Build standard structure, autoCreateSalesTrack is system-enforced to true
    const updated = {
      defaultIntakeStatus,
      enablePartialSelling: settings.enablePartialSelling !== undefined ? !!settings.enablePartialSelling : DEFAULT_INTAKE_WORKFLOW_SETTINGS.enablePartialSelling,
      requireBuyerBeforeSelling: settings.requireBuyerBeforeSelling !== undefined ? !!settings.requireBuyerBeforeSelling : DEFAULT_INTAKE_WORKFLOW_SETTINGS.requireBuyerBeforeSelling,
      autoCreateSalesTrack: true, // Force to true in DB payload
      requireCancellationNotes: settings.requireCancellationNotes !== undefined ? !!settings.requireCancellationNotes : DEFAULT_INTAKE_WORKFLOW_SETTINGS.requireCancellationNotes
    };

    const settingsValue = JSON.stringify(updated);

    await prisma.systemSetting.upsert({
      where: { key: "intake_workflow_settings" },
      update: { value: settingsValue },
      create: { key: "intake_workflow_settings", value: settingsValue }
    });

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    ApplicationLogger.error("Failed to save intake workflow settings action", error);
    return { success: false, error: error.message || "Failed to save intake workflow settings" };
  }
}

export async function getFeatureFlagsAction() {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Unauthorized" };
    }
    const { getFeatureFlags } = await import("@/lib/settings/featureFlags");
    const flags = await getFeatureFlags();
    return { success: true, flags };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export const saveFeatureFlagsAction = withSecurity(
  async function (flags) {
    try {
      const value = JSON.stringify(flags);
      await prisma.systemSetting.upsert({
        where: { key: "feature_flags" },
        update: { value },
        create: { key: "feature_flags", value }
      });
      revalidatePath("/", "layout");
      revalidatePath("/settings");
      revalidatePath("/sales");
      revalidatePath("/source-tracking");
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
  {
    actionName: "Update Feature Flags",
    roleCheck: (role) => role === "SUPER_ADMIN",
    requirePassword: true
  }
);








