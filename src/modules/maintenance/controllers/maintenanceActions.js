"use server";

import { getSession } from "@/lib/session";
import { canAccessSettings } from "@/lib/permissions";
import { MaintenanceService } from "../services/MaintenanceService";
import { fullBackupSchema } from "../validations/maintenanceSchema";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const session = await getSession();
  if (!session || !canAccessSettings(session.role)) {
    throw new Error("Unauthorized: Administrator privilege required");
  }
  return session;
}

export async function exportDatabaseAction() {
  try {
    await assertAdmin();
    const backup = await MaintenanceService.exportDatabase();
    return { success: true, backup };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function restoreDatabaseAction(backupPayload) {
  try {
    const session = await assertAdmin();
    
    // Zod structural check
    const validation = fullBackupSchema.safeParse(backupPayload);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(", ");
      return { success: false, error: `Invalid backup schema: ${errorMsg}` };
    }

    await MaintenanceService.restoreDatabase(validation.data, session);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function resetSystemAction(options) {
  try {
    const session = await assertAdmin();
    await MaintenanceService.resetSystem(options, session);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function importProductsAction(products) {
  try {
    const session = await assertAdmin();
    if (!Array.isArray(products)) {
      return { success: false, error: "Invalid product import data shape. Array expected." };
    }
    const result = await MaintenanceService.importProducts(products, session);
    revalidatePath("/products");
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function importPartiesAction(parties) {
  try {
    const session = await assertAdmin();
    if (!Array.isArray(parties)) {
      return { success: false, error: "Invalid party import data shape. Array expected." };
    }
    const result = await MaintenanceService.importParties(parties, session);
    revalidatePath("/parties");
    return { success: true, ...result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function cleanupLogsAction() {
  try {
    const session = await assertAdmin();
    const result = await MaintenanceService.cleanupLogs(session);
    revalidatePath("/settings");
    return { success: true, deletedCount: result.deletedCount };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function recalculateInventoryAction() {
  try {
    const session = await assertAdmin();
    const result = await MaintenanceService.recalculateInventory(session);
    revalidatePath("/products");
    return { success: true, count: result.count };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function rebuildLedgerSnapshotsAction() {
  try {
    const session = await assertAdmin();
    const result = await MaintenanceService.rebuildLedgerSnapshots(session);
    revalidatePath("/ledger");
    return { success: true, count: result.count };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
