"use server";

import { DataImportService } from "../services/DataImportService";
import { withOwnership } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { ApplicationLogger } from "@/lib/logger";

import { prisma } from "@/lib/prisma";

/**
 * Parses and validates an uploaded Excel/CSV file without saving to the database.
 * Returns a list of rows with validity status and conflicts.
 */
export async function validateImportAction(formData) {
  try {
    const file = formData.get("file");
    const type = formData.get("type"); // "PARTIES" | "PRODUCTS"

    if (!file || typeof file === "string") {
      return { success: false, error: "No file was uploaded." };
    }
    if (!type || (type !== "PARTIES" && type !== "PRODUCTS")) {
      return { success: false, error: "Invalid import type." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const report = await DataImportService.validateImport(buffer, type);
    return JSON.parse(JSON.stringify({ success: true, report }));
  } catch (error) {
    ApplicationLogger.error("Error in validateImportAction", error);
    return { success: false, error: error.message || "Failed to validate import spreadsheet." };
  }
}

/**
 * Commits the validated rows to the database using the specified conflict resolutions.
 */
export async function commitImportAction(rows, type, resolutions) {
  try {
    const ownership = await withOwnership();
    const migrationId = `MIG-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    const stats = await DataImportService.commitImport(rows, type, resolutions, migrationId, ownership);

    // Revalidate paths to refresh registry screens
    revalidatePath("/parties");
    revalidatePath("/products");
    revalidatePath("/settings");

    return JSON.parse(JSON.stringify({ success: true, stats, migrationId }));
  } catch (error) {
    ApplicationLogger.error("Error in commitImportAction", error);
    return { success: false, error: error.message || "Failed to commit historical data import." };
  }
}

/**
 * Fetches summary counts of currently imported opening balances and stock snapshots.
 */
export async function getImportSummaryAction() {
  try {
    const partiesCount = await prisma.partyOpeningBalance.count();
    const productsCount = await prisma.initialStock.count();

    const initialStockMigrations = await prisma.initialStock.findMany({
      select: { migrationId: true },
      distinct: ["migrationId"]
    });

    const openingBalanceMigrations = await prisma.partyOpeningBalance.findMany({
      select: { migrationId: true },
      distinct: ["migrationId"]
    });

    const uniqueMigrationIds = Array.from(new Set([
      ...initialStockMigrations.map(m => m.migrationId),
      ...openingBalanceMigrations.map(m => m.migrationId)
    ].filter(Boolean)));

    return JSON.parse(JSON.stringify({
      success: true,
      summary: {
        partiesCount,
        productsCount,
        migrationCount: uniqueMigrationIds.length,
        migrationIds: uniqueMigrationIds
      }
    }));
  } catch (error) {
    ApplicationLogger.error("Error in getImportSummaryAction", error);
    return { success: false, error: error.message || "Failed to fetch import summary." };
  }
}
