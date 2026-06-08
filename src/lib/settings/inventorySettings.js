import { prisma } from "@/lib/prisma";

export const DEFAULT_INVENTORY_SETTINGS = {
  negativeStockAllowed: false,
  autoNormalizeUnits: true,
  inventorySnapshotFrequency: "REALTIME",
  lowStockThreshold: 10,
  lowStockAlertEnabled: true,
  showOnlyActiveProducts: true
};

/**
 * Fetches the system inventory settings from the database, merging them with standard default values.
 * 
 * @returns {Promise<object>} The resolved inventory settings object.
 */
export async function getInventorySettings() {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: "inventory_settings" }
    });
    
    if (!record) {
      return DEFAULT_INVENTORY_SETTINGS;
    }
    
    const parsed = JSON.parse(record.value);
    
    return {
      negativeStockAllowed: parsed.negativeStockAllowed !== undefined ? !!parsed.negativeStockAllowed : DEFAULT_INVENTORY_SETTINGS.negativeStockAllowed,
      autoNormalizeUnits: parsed.autoNormalizeUnits !== undefined ? !!parsed.autoNormalizeUnits : DEFAULT_INVENTORY_SETTINGS.autoNormalizeUnits,
      inventorySnapshotFrequency: parsed.inventorySnapshotFrequency || DEFAULT_INVENTORY_SETTINGS.inventorySnapshotFrequency,
      lowStockThreshold: parsed.lowStockThreshold !== undefined ? parseInt(parsed.lowStockThreshold, 10) : DEFAULT_INVENTORY_SETTINGS.lowStockThreshold,
      lowStockAlertEnabled: parsed.lowStockAlertEnabled !== undefined ? !!parsed.lowStockAlertEnabled : DEFAULT_INVENTORY_SETTINGS.lowStockAlertEnabled,
      showOnlyActiveProducts: parsed.showOnlyActiveProducts !== undefined ? !!parsed.showOnlyActiveProducts : DEFAULT_INVENTORY_SETTINGS.showOnlyActiveProducts
    };
  } catch (error) {
    console.error("Error reading inventory settings:", error);
    return DEFAULT_INVENTORY_SETTINGS;
  }
}
