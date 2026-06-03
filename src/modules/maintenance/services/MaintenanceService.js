import { prisma } from "@/lib/prisma";
import { emitActivity } from "@/modules/activity-log/activityLogger";
import { getActivityAuditSettings } from "@/lib/settings/activityAuditSettings";
import { InventoryService } from "@/modules/products/services/InventoryService";
import { LedgerService } from "@/modules/ledger/services/LedgerService";
import { ProductService } from "@/modules/products/services/ProductService";
import { PartyService } from "@/modules/parties/services/PartyService";
import { isMSSQL } from "@/lib/database/provider";

const TABLES_DELETE_ORDER = [
  "PartyPaymentAllocation",
  "PartyPayment",
  "SupplierInvoiceAdjustment",
  "SupplierInvoiceItem",
  "SupplierInvoice",
  "TransactionAdjustment",
  "SalesTrack",
  "SaleItem",
  "SaleTransaction",
  "IntakeAdvance",
  "IntakeTransaction",
  "ProductRate",
  "Product",
  "Party",
  "ActivityLog",
  "LedgerSession",
  "SystemSetting",
  "User"
];

const TABLES_INSERT_ORDER = [
  "User",
  "SystemSetting",
  "LedgerSession",
  "ActivityLog",
  "Party",
  "Product",
  "ProductRate",
  "IntakeTransaction",
  "IntakeAdvance",
  "SaleTransaction",
  "SaleItem",
  "SalesTrack",
  "TransactionAdjustment",
  "SupplierInvoice",
  "SupplierInvoiceItem",
  "SupplierInvoiceAdjustment",
  "PartyPayment",
  "PartyPaymentAllocation"
];

const MODEL_MAPPING = {
  User: "user",
  SystemSetting: "systemSetting",
  LedgerSession: "ledgerSession",
  ActivityLog: "activityLog",
  Party: "party",
  Product: "product",
  ProductRate: "productRate",
  IntakeTransaction: "intakeTransaction",
  IntakeAdvance: "intakeAdvance",
  SaleTransaction: "saleTransaction",
  SaleItem: "saleItem",
  SalesTrack: "salesTrack",
  TransactionAdjustment: "transactionAdjustment",
  SupplierInvoice: "supplierInvoice",
  SupplierInvoiceItem: "supplierInvoiceItem",
  SupplierInvoiceAdjustment: "supplierInvoiceAdjustment",
  PartyPayment: "partyPayment",
  PartyPaymentAllocation: "partyPaymentAllocation"
};

const DATE_FIELDS = new Set(["createdAt", "updatedAt", "entryDate", "startDate", "endDate"]);

function serializeValue(val) {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object") {
    if (val.constructor && val.constructor.name === "Decimal") {
      return Number(val.toString());
    }
    if (Array.isArray(val)) {
      return val.map(serializeValue);
    }
    const serialized = {};
    for (const [k, v] of Object.entries(val)) {
      serialized[k] = serializeValue(v);
    }
    return serialized;
  }
  return val;
}

function deserializeRecord(record) {
  const deserialized = {};
  for (const [key, val] of Object.entries(record)) {
    if (DATE_FIELDS.has(key) && val) {
      deserialized[key] = new Date(val);
    } else {
      deserialized[key] = val;
    }
  }
  return deserialized;
}

export class MaintenanceService {
  /**
   * Export the entire database into a JSON object.
   */
  static async exportDatabase() {
    const data = {};
    for (const modelName of TABLES_INSERT_ORDER) {
      const modelKey = MODEL_MAPPING[modelName];
      const records = await prisma[modelKey].findMany();
      data[modelName] = records.map(serializeValue);
    }

    return {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      data
    };
  }

  /**
   * Safe transaction-based restore of full database backup.
   * If any insert fails, the transaction is completely rolled back.
   */
  static async restoreDatabase(backupPayload, actingUser = {}) {
    const { data } = backupPayload;

    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing records in reverse dependency order
      for (const table of TABLES_DELETE_ORDER) {
        const modelKey = MODEL_MAPPING[table];
        await tx[modelKey].deleteMany();
      }

      // 2. Insert backup records in dependency order
      for (const table of TABLES_INSERT_ORDER) {
        const modelKey = MODEL_MAPPING[table];
        const records = data[table] || [];

        if (records.length === 0) continue;

        // SQL Server identity insert capability toggle
        if (isMSSQL()) {
          await tx.$executeRawUnsafe(`SET IDENTITY_INSERT [${table}] ON`);
        }

        for (const record of records) {
          const deserialized = deserializeRecord(record);
          await tx[modelKey].create({
            data: deserialized
          });
        }

        if (isMSSQL()) {
          await tx.$executeRawUnsafe(`SET IDENTITY_INSERT [${table}] OFF`);
        }
      }
    }, {
      timeout: 30000 // Allow up to 30 seconds for complete database restores
    });

    // 3. Log restore operation
    await emitActivity({
      entityType: "SYSTEM",
      action: "UPDATED",
      description: "Database completely restored from backup",
      userId: actingUser.userId || 0,
      userName: actingUser.userName || "system",
      meta: { exportedAt: backupPayload.exportedAt }
    });

    return { success: true };
  }

  /**
   * Reset demo/transactional data safely.
   */
  static async resetSystem({ keepUsers = true, keepSettings = true } = {}, actingUser = {}) {
    await prisma.$transaction(async (tx) => {
      // Preserve configuration & admins
      const usersToKeep = keepUsers 
        ? await tx.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } })
        : [];
      const settingsToKeep = keepSettings
        ? await tx.systemSetting.findMany()
        : [];

      // Delete all tables in reverse dependency order
      for (const table of TABLES_DELETE_ORDER) {
        const modelKey = MODEL_MAPPING[table];
        await tx[modelKey].deleteMany();
      }

      // Restore preserved Users
      if (keepUsers && usersToKeep.length > 0) {
        if (isMSSQL()) await tx.$executeRawUnsafe(`SET IDENTITY_INSERT [User] ON`);
        for (const u of usersToKeep) {
          await tx.user.create({ data: u });
        }
        if (isMSSQL()) await tx.$executeRawUnsafe(`SET IDENTITY_INSERT [User] OFF`);
      }

      // Restore preserved settings
      if (keepSettings && settingsToKeep.length > 0) {
        if (isMSSQL()) await tx.$executeRawUnsafe(`SET IDENTITY_INSERT [SystemSetting] ON`);
        for (const s of settingsToKeep) {
          await tx.systemSetting.create({ data: s });
        }
        if (isMSSQL()) await tx.$executeRawUnsafe(`SET IDENTITY_INSERT [SystemSetting] OFF`);
      }
    });

    await emitActivity({
      entityType: "SYSTEM",
      action: "DELETED",
      description: `System data reset triggered (keepUsers: ${keepUsers}, keepSettings: ${keepSettings})`,
      userId: actingUser.userId || 0,
      userName: actingUser.userName || "system"
    });

    return { success: true };
  }

  /**
   * Idempotently imports products list by invoking the ProductService layer.
   */
  static async importProducts(products, actingUser = {}) {
    let successCount = 0;
    const errors = [];

    for (const prod of products) {
      try {
        await ProductService.createProduct(prod);
        successCount++;
      } catch (err) {
        errors.push({ name: prod.name, error: err.message });
      }
    }

    await emitActivity({
      entityType: "SYSTEM",
      action: "CREATED",
      description: `Imported ${successCount} products successfully (${errors.length} skipped)`,
      userId: actingUser.userId || 0,
      userName: actingUser.userName || "system",
      meta: { successCount, errorCount: errors.length }
    });

    return { successCount, errors };
  }

  /**
   * Idempotently imports parties list by invoking the PartyService layer.
   */
  static async importParties(parties, actingUser = {}) {
    let successCount = 0;
    const errors = [];

    for (const party of parties) {
      try {
        await PartyService.createParty(party);
        successCount++;
      } catch (err) {
        errors.push({ name: party.name, error: err.message });
      }
    }

    await emitActivity({
      entityType: "SYSTEM",
      action: "CREATED",
      description: `Imported ${successCount} parties successfully (${errors.length} skipped)`,
      userId: actingUser.userId || 0,
      userName: actingUser.userName || "system",
      meta: { successCount, errorCount: errors.length }
    });

    return { successCount, errors };
  }

  /**
   * Deletes activity logs older than retention days limit.
   */
  static async cleanupLogs(actingUser = {}) {
    const settings = await getActivityAuditSettings();
    const retentionDays = settings.logRetentionDays;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const deleted = await prisma.activityLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    await emitActivity({
      entityType: "SYSTEM",
      action: "DELETED",
      description: `Manually cleaned up activity logs older than ${retentionDays} days (${deleted.count} entries removed)`,
      userId: actingUser.userId || 0,
      userName: actingUser.userName || "system",
      meta: { deletedCount: deleted.count, retentionDays }
    });

    return { deletedCount: deleted.count };
  }

  /**
   * Idempotently recalculates all inventory stock.
   */
  static async recalculateInventory(actingUser = {}) {
    const results = await InventoryService.recalculateAllProductsStock();
    
    await emitActivity({
      entityType: "SYSTEM",
      action: "UPDATED",
      description: "Recalculated physical inventory stock balances for all products",
      userId: actingUser.userId || 0,
      userName: actingUser.userName || "system",
      meta: { productCount: results.length }
    });

    return { success: true, count: results.length };
  }

  /**
   * Idempotently rebuilds Saved Ledger Reconciliation summaries from live data.
   */
  static async rebuildLedgerSnapshots(actingUser = {}) {
    const sessions = await prisma.ledgerSession.findMany();
    let updatedCount = 0;

    for (const session of sessions) {
      const liveSummary = await LedgerService.getLiveReconciliationSummary({
        startDate: session.startDate,
        endDate: session.endDate
      });

      await prisma.ledgerSession.update({
        where: { id: session.id },
        data: {
          supplierTotal: liveSummary.supplier.baseTotal,
          buyerTotal: liveSummary.buyer.baseTotal,
          difference: liveSummary.difference,
          supplierInvoiceCount: liveSummary.supplier.activeCount,
          buyerInvoiceCount: liveSummary.buyer.activeCount
        }
      });
      updatedCount++;
    }

    await emitActivity({
      entityType: "SYSTEM",
      action: "UPDATED",
      description: `Rebuild ledger snapshots completed for ${updatedCount} reconciliation sessions`,
      userId: actingUser.userId || 0,
      userName: actingUser.userName || "system",
      meta: { sessionCount: updatedCount }
    });

    return { success: true, count: updatedCount };
  }
}
