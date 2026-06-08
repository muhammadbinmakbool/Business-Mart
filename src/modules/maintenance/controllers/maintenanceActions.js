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

export async function getProviderAction() {
  try {
    await assertAdmin();
    const { getProvider } = await import("@/lib/database/provider");
    return { success: true, provider: getProvider() };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function backupSqliteFileAction(targetDir) {
  try {
    const session = await assertAdmin();
    const { isSQLite } = await import("@/lib/database/provider");
    const fs = await import("fs");
    const path = await import("path");

    if (!isSQLite()) {
      return { success: false, error: "Physical file backup is only supported in SQLite mode." };
    }

    if (!targetDir || typeof targetDir !== "string") {
      return { success: false, error: "Please specify a valid backup directory path." };
    }

    let dbUrl = process.env.DATABASE_URL || "";
    if (!dbUrl.startsWith("file:")) {
      return { success: false, error: "Active database URL is not configured as a local file URL." };
    }

    const srcPath = path.resolve(dbUrl.replace(/^file:/, ""));
    if (!fs.existsSync(srcPath)) {
      return { success: false, error: `SQLite active database file not found at: ${srcPath}` };
    }

    // Create target directory if missing
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const destName = `business_mart_backup_${timestamp}.db`;
    const destPath = path.join(targetDir, destName);

    fs.copyFileSync(srcPath, destPath);

    return { success: true, destPath, filename: destName };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
