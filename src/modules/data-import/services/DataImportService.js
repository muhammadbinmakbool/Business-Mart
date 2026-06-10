import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { partyImportSchema, productImportSchema } from "../validations/importValidation";
import { InventoryService } from "@/modules/products/services/InventoryService";
import { UNITS } from "@/lib/units";
import { emitActivity } from "@/modules/activity-log/activityLogger";

export class DataImportService {
  /**
   * Helper to normalize spreadsheet keys to lowercase camelCase, tolerating spacing/case variations.
   */
  static normalizeRowKeys(rawRow) {
    if (!rawRow || typeof rawRow !== "object") return {};
    const normalized = {};
    for (const key of Object.keys(rawRow)) {
      const cleanKey = key.replace(/[\s_-]/g, "").toLowerCase();
      
      if (cleanKey === "name") {
        normalized.name = rawRow[key] !== undefined && rawRow[key] !== null ? String(rawRow[key]) : undefined;
      }
      else if (cleanKey === "phonenumber" || cleanKey === "phone" || cleanKey === "phone_number") {
        normalized.phoneNumber = rawRow[key] !== undefined && rawRow[key] !== null ? String(rawRow[key]).trim() : undefined;
      }
      else if (cleanKey === "address") {
        normalized.address = rawRow[key] !== undefined && rawRow[key] !== null ? String(rawRow[key]) : undefined;
      }
      else if (cleanKey === "partytype" || cleanKey === "type") {
        normalized.partyType = rawRow[key];
      }
      else if (cleanKey === "openingbalance" || cleanKey === "balance") {
        normalized.openingBalance = rawRow[key];
      }
      else if (cleanKey === "openingbalancetype" || cleanKey === "balancetype") {
        normalized.openingBalanceType = rawRow[key];
      }
      else if (cleanKey === "notes" || cleanKey === "note") {
        normalized.notes = rawRow[key];
      }
      else if (cleanKey === "category") {
        normalized.category = rawRow[key];
      }
      else if (cleanKey === "primaryunit" || cleanKey === "unit") {
        normalized.primaryUnit = rawRow[key];
      }
      else if (cleanKey === "unitconversion" || cleanKey === "conversion") {
        normalized.unitConversion = rawRow[key];
      }
      else if (cleanKey === "initialstock" || cleanKey === "stock") {
        normalized.initialStock = rawRow[key];
      }
      else if (cleanKey === "initialstockunit" || cleanKey === "stockunit") {
        normalized.initialStockUnit = rawRow[key];
      }
      else {
        const firstLower = key.charAt(0).toLowerCase() + key.slice(1);
        normalized[firstLower] = rawRow[key];
      }
    }
    return normalized;
  }

  /**
   * Parses and validates a spreadsheet buffer.
   * Returns a list of parsed rows, validation status, and detected conflicts.
   *
   * @param {Buffer} fileBuffer
   * @param {"PARTIES" | "PRODUCTS"} type
   * @returns {Promise<object>} Validation report
   */
  static async validateImport(fileBuffer, type) {
    let workbook;
    try {
      workbook = XLSX.read(fileBuffer, { type: "buffer" });
    } catch (e) {
      return { success: false, error: "Invalid Excel or CSV file format." };
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, error: "The spreadsheet has no sheets." };
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return { success: false, error: "The spreadsheet is empty." };
    }

    const parsedRows = [];
    const conflicts = [];
    let hasExistingInitialization = false;

    // Fetch existing records for fast duplicate lookup
    let existingParties = [];
    let existingProducts = [];
    let existingOpeningBalances = 0;
    let existingInitialStocks = 0;

    if (type === "PARTIES") {
      existingParties = await prisma.party.findMany({
        where: { isDeleted: false },
        include: { openingBalance: true }
      });
      existingOpeningBalances = await prisma.partyOpeningBalance.count();
    } else {
      existingProducts = await prisma.product.findMany({
        where: { isDeleted: false },
        include: { initialStock: true }
      });
      existingInitialStocks = await prisma.initialStock.count();
    }

    for (let idx = 0; idx < rawData.length; idx++) {
      const rawRow = rawData[idx];
      const rowNum = idx + 2; // Excel row numbering starts at 1, headers on row 1

      // 1. Zod Parsing & Normalization
      const schema = type === "PARTIES" ? partyImportSchema : productImportSchema;
      const normalizedRow = DataImportService.normalizeRowKeys(rawRow);
      const parseResult = schema.safeParse(normalizedRow);

      if (!parseResult.success) {
        // Collect errors
        const issues = parseResult.error.issues || parseResult.error.errors || [];
        const errorMessages = issues.map(err => `${err.path.join(".")}: ${err.message}`).join(", ");
        parsedRows.push({
          rowNumber: rowNum,
          raw: rawRow,
          isValid: false,
          errors: errorMessages
        });
        continue;
      }

      const data = parseResult.data;
      let conflictInfo = null;

      // 2. Conflict & Duplicate Checks
      if (type === "PARTIES") {
        // Match by name (case-insensitive) or phone (exact)
        const nameMatch = existingParties.find(
          p => p.name.trim().toLowerCase() === data.name.toLowerCase()
        );
        const phoneMatch = existingParties.find(
          p => p.phoneNumber.trim() === data.phoneNumber
        );

        if (nameMatch || phoneMatch) {
          const matchType = nameMatch && phoneMatch ? "NAME_AND_PHONE" : nameMatch ? "NAME_MATCH" : "PHONE_MATCH";
          const matchedParty = nameMatch || phoneMatch;
          
          conflictInfo = {
            entityId: matchedParty.id,
            matchType,
            matchedName: matchedParty.name,
            matchedPhone: matchedParty.phoneNumber,
            hasExistingData: !!matchedParty.openingBalance
          };

          if (matchedParty.openingBalance) {
            hasExistingInitialization = true;
          }
        }
      } else {
        // Match by product name (case-insensitive)
        const nameMatch = existingProducts.find(
          p => p.name.trim().toLowerCase() === data.name.toLowerCase()
        );

        if (nameMatch) {
          conflictInfo = {
            entityId: nameMatch.id,
            matchType: "NAME_MATCH",
            matchedName: nameMatch.name,
            hasExistingData: !!nameMatch.initialStock
          };

          if (nameMatch.initialStock) {
            hasExistingInitialization = true;
          }
        }
      }

      // 3. Custom Business Rule Validations
      if (type === "PRODUCTS") {
        const pUnit = UNITS[data.primaryUnit];
        if (!pUnit) {
          parsedRows.push({
            rowNumber: rowNum,
            raw: rawRow,
            isValid: false,
            errors: `Invalid primary unit: "${data.primaryUnit || ''}"`
          });
          continue;
        }
        if (pUnit.category !== data.category) {
          parsedRows.push({
            rowNumber: rowNum,
            raw: rawRow,
            isValid: false,
            errors: `Primary Unit "${data.primaryUnit}" (${pUnit.category}) is incompatible with product category "${data.category}"`
          });
          continue;
        }

        if (data.initialStock > 0) {
          const sUnitId = data.initialStockUnit || data.primaryUnit;
          const sUnit = UNITS[sUnitId];
          if (!sUnit) {
            parsedRows.push({
              rowNumber: rowNum,
              raw: rawRow,
              isValid: false,
              errors: `Invalid initial stock unit: "${sUnitId || ''}"`
            });
            continue;
          }
          if (sUnit.category !== data.category) {
            parsedRows.push({
              rowNumber: rowNum,
              raw: rawRow,
              isValid: false,
              errors: `Initial Stock Unit "${sUnitId}" (${sUnit.category}) is incompatible with product category "${data.category}"`
            });
            continue;
          }
          
          let conversionFactor = data.unitConversion;
          if (conflictInfo && conflictInfo.entityId && (conversionFactor === null || conversionFactor === undefined || conversionFactor <= 0)) {
            const matchedProduct = existingProducts.find(p => p.id === conflictInfo.entityId);
            if (matchedProduct) {
              conversionFactor = matchedProduct.unitConversion;
            }
          }

          if (sUnit.productSpecific && (!conversionFactor || Number(conversionFactor) <= 0)) {
            parsedRows.push({
              rowNumber: rowNum,
              raw: rawRow,
              isValid: false,
              errors: `MISSING_CONVERSION: Unit ${sUnitId} is product-specific but no conversion factor is defined for product "${data.name}"`
            });
            continue;
          }
        }
      }

      parsedRows.push({
        rowNumber: rowNum,
        data,
        isValid: true,
        conflict: conflictInfo
      });
    }

    return {
      success: true,
      totalRows: rawData.length,
      validCount: parsedRows.filter(r => r.isValid).length,
      invalidCount: parsedRows.filter(r => !r.isValid).length,
      hasConflicts: parsedRows.some(r => r.conflict !== null),
      hasExistingInitialization, // Flags if any matched entity has an existing opening balance or stock snapshot
      rows: parsedRows
    };
  }

  /**
   * Commits the import transaction.
   *
   * @param {Array} rows - List of parsed valid rows to commit
   * @param {"PARTIES" | "PRODUCTS"} type
   * @param {object} resolutions - Object mapping row index/identity to "Replace" | "Duplicate" | "Skip"
   * @param {string} migrationId - Generated UUID for this batch
   * @param {object} ownership - { userId, businessId }
   */
  static async commitImport(rows, type, resolutions, migrationId, { userId, businessId }) {
    const stats = {
      created: 0,
      replaced: 0,
      skipped: 0,
      logs: []
    };

    const affectedProductIds = new Set();

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (!row.isValid) continue;

        const resolution = resolutions[row.rowNumber] || "Duplicate";

        if (resolution === "Skip") {
          stats.skipped++;
          stats.logs.push(`Row ${row.rowNumber} skipped by operator instruction.`);
          continue;
        }

        const data = row.data;

        if (type === "PARTIES") {
          const hasConflict = row.conflict !== null;

          if (hasConflict && resolution === "Replace") {
            const existingId = row.conflict.entityId;

            // Fetch old balance first for audit logging
            const oldBalance = await tx.partyOpeningBalance.findUnique({
              where: { partyId: existingId }
            });

            // Replace opening balance only
            await tx.partyOpeningBalance.upsert({
              where: { partyId: existingId },
              create: {
                partyId: existingId,
                amount: data.openingBalance,
                type: data.openingBalanceType,
                notes: data.notes || `Replaced via import batch ${migrationId}`,
                migrationId,
                userId,
                businessId
              },
              update: {
                amount: data.openingBalance,
                type: data.openingBalanceType,
                notes: data.notes || `Replaced via import batch ${migrationId}`,
                migrationId,
                userId,
                businessId
              }
            });

            // Log replacement activity
            await emitActivity({
              entityType: "PARTY",
              entityId: existingId,
              action: "UPDATED",
              description: `Onboarding: Party opening balance replaced in batch ${migrationId}`,
              userId,
              businessId,
              meta: JSON.stringify({
                oldValue: oldBalance ? { amount: Number(oldBalance.amount), type: oldBalance.type } : null,
                newValue: { amount: Number(data.openingBalance), type: data.openingBalanceType },
                migrationId
              })
            });

            stats.replaced++;
            stats.logs.push(`Row ${row.rowNumber} replaced opening balance of existing Party ID ${existingId}.`);
          } else {
            // Create New or Duplicate Party
            let partyName = data.name;
            let sourceVal = null;
            if (hasConflict && resolution === "Duplicate") {
              partyName = `${data.name} (Imported)`;
              sourceVal = "MIGRATED_DUPLICATE";
            }

            const newParty = await tx.party.create({
              data: {
                name: partyName,
                phoneNumber: data.phoneNumber,
                address: data.address,
                notes: data.notes,
                partyType: data.partyType,
                migrationId,
                source: sourceVal,
                userId,
                businessId
              }
            });

            if (data.openingBalance > 0) {
              await tx.partyOpeningBalance.create({
                data: {
                  partyId: newParty.id,
                  amount: data.openingBalance,
                  type: data.openingBalanceType,
                  notes: data.notes || `Imported via batch ${migrationId}`,
                  migrationId,
                  userId,
                  businessId
                }
              });
            }

            stats.created++;
            stats.logs.push(`Row ${row.rowNumber} created new Party "${partyName}".`);
          }
        } else {
          // PRODUCTS type
          const hasConflict = row.conflict !== null;

          if (hasConflict && resolution === "Replace") {
            const existingId = row.conflict.entityId;

            // Fetch old stock first for audit logging
            const oldStock = await tx.initialStock.findUnique({
              where: { productId: existingId }
            });

            // If unit conversion is specified on the row, update the existing product's factor
            if (data.unitConversion !== undefined && data.unitConversion !== null) {
              await tx.product.update({
                where: { id: existingId },
                data: {
                  unitConversion: data.unitConversion
                }
              });
            }

            // Replace initial stock record
            await tx.initialStock.upsert({
              where: { productId: existingId },
              create: {
                productId: existingId,
                quantity: data.initialStock,
                unit: data.initialStockUnit || data.primaryUnit,
                notes: data.notes || `Replaced via import batch ${migrationId}`,
                migrationId,
                userId,
                businessId
              },
              update: {
                quantity: data.initialStock,
                unit: data.initialStockUnit || data.primaryUnit,
                notes: data.notes || `Replaced via import batch ${migrationId}`,
                migrationId,
                userId,
                businessId
              }
            });

            // Log replacement activity
            await emitActivity({
              entityType: "PRODUCT",
              entityId: existingId,
              action: "UPDATED",
              description: `Onboarding: Product initial stock replaced in batch ${migrationId}`,
              userId,
              businessId,
              meta: JSON.stringify({
                oldValue: oldStock ? { quantity: Number(oldStock.quantity), unit: oldStock.unit } : null,
                newValue: { quantity: Number(data.initialStock), unit: data.initialStockUnit || data.primaryUnit },
                migrationId
              })
            });

            affectedProductIds.add(existingId);
            stats.replaced++;
            stats.logs.push(`Row ${row.rowNumber} replaced initial stock of existing Product ID ${existingId}.`);
          } else {
            // Create New or Duplicate Product
            let prodName = data.name;
            let sourceVal = null;
            if (hasConflict && resolution === "Duplicate") {
              prodName = `${data.name} (Imported)`;
              sourceVal = "MIGRATED_DUPLICATE";
            }

            const newProd = await tx.product.create({
              data: {
                name: prodName,
                category: data.category,
                primaryUnit: data.primaryUnit,
                unitConversion: data.unitConversion,
                migrationId,
                source: sourceVal,
                userId,
                businessId
              }
            });

            if (data.initialStock > 0) {
              await tx.initialStock.create({
                data: {
                  productId: newProd.id,
                  quantity: data.initialStock,
                  unit: data.initialStockUnit || data.primaryUnit,
                  notes: data.notes || `Imported via batch ${migrationId}`,
                  migrationId,
                  userId,
                  businessId
                }
              });
            }

            affectedProductIds.add(newProd.id);
            stats.created++;
            stats.logs.push(`Row ${row.rowNumber} created new Product "${prodName}".`);
          }
        }
      }

      // Recalculate stock for all affected products inside the transaction
      for (const pId of affectedProductIds) {
        await InventoryService.recalculateProductStock(pId, tx);
      }
    });

    return stats;
  }
}
