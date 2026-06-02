import { prisma } from "@/lib/prisma";

export const DEFAULT_SETTLEMENT_LEDGER_SETTINGS = {
  reconciliationTolerance: 1.00,
  defaultAdjustmentVisibility: {
    commission: true,
    labour: true,
    rent: true,
    kaat: true
  },
  autoMarkOutdatedInvoices: true,
  requireConfirmationBeforeRegeneration: true
};

/**
 * Fetches the system settlement & ledger settings from the database, merging them with standard default values.
 * 
 * @returns {Promise<object>} The resolved settlement & ledger settings object.
 */
export async function getSettlementLedgerSettings() {
  try {
    const record = await prisma.systemSetting.findUnique({
      where: { key: "settlement_ledger_settings" }
    });
    
    if (!record) {
      return DEFAULT_SETTLEMENT_LEDGER_SETTINGS;
    }
    
    const parsed = JSON.parse(record.value);
    
    // Safeguard nested defaultAdjustmentVisibility
    const parsedVisibility = parsed.defaultAdjustmentVisibility || {};
    const defaultVisibility = DEFAULT_SETTLEMENT_LEDGER_SETTINGS.defaultAdjustmentVisibility;
    
    return {
      reconciliationTolerance: parsed.reconciliationTolerance !== undefined ? parseFloat(parsed.reconciliationTolerance) : DEFAULT_SETTLEMENT_LEDGER_SETTINGS.reconciliationTolerance,
      defaultAdjustmentVisibility: {
        commission: parsedVisibility.commission !== undefined ? !!parsedVisibility.commission : defaultVisibility.commission,
        labour: parsedVisibility.labour !== undefined ? !!parsedVisibility.labour : defaultVisibility.labour,
        rent: parsedVisibility.rent !== undefined ? !!parsedVisibility.rent : defaultVisibility.rent,
        kaat: parsedVisibility.kaat !== undefined ? !!parsedVisibility.kaat : defaultVisibility.kaat
      },
      autoMarkOutdatedInvoices: parsed.autoMarkOutdatedInvoices !== undefined ? !!parsed.autoMarkOutdatedInvoices : DEFAULT_SETTLEMENT_LEDGER_SETTINGS.autoMarkOutdatedInvoices,
      requireConfirmationBeforeRegeneration: parsed.requireConfirmationBeforeRegeneration !== undefined ? !!parsed.requireConfirmationBeforeRegeneration : DEFAULT_SETTLEMENT_LEDGER_SETTINGS.requireConfirmationBeforeRegeneration
    };
  } catch (error) {
    console.error("Error reading settlement & ledger settings:", error);
    return DEFAULT_SETTLEMENT_LEDGER_SETTINGS;
  }
}
