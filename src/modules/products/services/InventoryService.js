import { prisma } from "@/lib/prisma";
import { UnitService } from "./UnitService";
import { normalizeQuantity } from "@/lib/units";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * InventoryService — Unified Inventory State Manager
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * INVENTORY PHILOSOPHY:
 *   Inventory is transaction-derived.
 *
 *   Current Inventory =
 *     Opening Stock (InitialStock)
 *     + All Active Intakes (IntakeTransaction.normalizedWeight)
 *     - All Active Sales (SaleItem.normalizedWeight)
 *
 *   Inventory never depends on:
 *   - Intake allocations / source tracking
 *   - Intake remainingWeight or remainingBagCount calculations
 *   - Supplier mappings
 *
 *   Sales invoices are billing/accounting records and do NOT directly mutate
 *   inventory. Inventory movement is derived from the balance of transactions.
 *
 * STOCK CALCULATION:
 *   Product.quantity = Opening Stock + SUM(Intake.normalizedWeight) - SUM(Sale.normalizedWeight)
 *                      WHERE status is not CANCELLED and isDeleted is false.
 *
 * This is the ONLY service that should modify Product.quantity.
 * IntakeService and SaleService delegate all stock mutations here.
 * ══════════════════════════════════════════════════════════════════════════════
 */
export class InventoryService {

  // ─────────────────────────────────────────────────────────────
  // Core Recalculation API
  // ─────────────────────────────────────────────────────────────

  /**
   * Recalculates and sets the Product.quantity for a single product.
   * Stock = Opening Stock + SUM(Intake.normalizedWeight) - SUM(Sale.normalizedWeight)
   *
   * @param {number} productId - The product ID to recalculate.
   * @param {object} [tx=prisma] - Prisma transaction client (or default prisma).
   */
  static async recalculateProductStock(productId, tx = prisma) {
    const prodId = parseInt(productId);
    
    // Fetch product details for unit normalization context
    const product = await tx.product.findUnique({
      where: { id: prodId }
    });
    if (!product) {
      throw new Error(`Product with ID ${prodId} not found.`);
    }

    const unitRegistry = await UnitService.getUnitRegistry();
    let totalStockIn = 0;

    // 1. Calculate Initial Stock In
    const initialStock = await tx.initialStock.findUnique({
      where: { productId: prodId },
      include: { product: true }
    });

    if (initialStock) {
      const normalizedInitialQty = normalizeQuantity(
        Number(initialStock.quantity), 
        initialStock.unit, 
        initialStock.product,
        unitRegistry
      );
      totalStockIn += normalizedInitialQty;
    }

    // 2. Calculate gross weight from active Intakes
    const activeIntakes = await tx.intakeTransaction.findMany({
      where: {
        productId: prodId,
        status: { not: "CANCELLED" },
        isDeleted: false
      },
      include: {
        product: true
      }
    });

    for (const intake of activeIntakes) {
      totalStockIn += Number(intake.normalizedWeight || 0);
    }

    // 3. Calculate weight from active Sale items
    const activeSaleItems = await tx.saleItem.findMany({
      where: {
        productId: prodId,
        sale: {
          status: { not: "CANCELLED" },
          isDeleted: false
        }
      }
    });

    let totalStockOut = 0;
    for (const item of activeSaleItems) {
      totalStockOut += Number(item.normalizedWeight || 0);
    }

    const finalProductQuantity = totalStockIn - totalStockOut;

    await tx.product.update({
      where: { id: prodId },
      data: { quantity: finalProductQuantity },
    });

    return finalProductQuantity;
  }

  /**
   * Recalculates stock for ALL products in the database.
   *
   * @param {object} [tx=prisma] - Prisma transaction client (or default prisma).
   * @returns {Array} Array of { productId, productName, newQuantity } results.
   */
  static async recalculateAllProductsStock(tx = prisma) {
    const products = await tx.product.findMany();
    const results = [];

    for (const product of products) {
      const newQuantity = await this.recalculateProductStock(product.id, tx);
      results.push({
        productId: product.id,
        productName: product.name,
        newQuantity,
      });
    }

    return results;
  }

  // ─────────────────────────────────────────────────────────────
  // Intake Lifecycle Events
  //
  // These are the ACTIVE handlers. Intake status transitions
  // are the sole driver of inventory changes.
  // ─────────────────────────────────────────────────────────────

  /**
   * Called after a new IntakeTransaction is created.
   * Recalculates the product's stock to include the new pending intake.
   */
  static async handleIntakeCreated(productId, tx = prisma) {
    return this.recalculateProductStock(productId, tx);
  }

  /**
   * Called after an IntakeTransaction is updated.
   * Handles product changes, weight changes, and status changes by
   * recalculating stock for all affected products.
   *
   * @param {number} oldProductId - The product ID before the update.
   * @param {number} newProductId - The product ID after the update.
   * @param {object} [tx=prisma] - Prisma transaction client.
   */
  static async handleIntakeUpdated(oldProductId, newProductId, tx = prisma) {
    await this.recalculateProductStock(oldProductId, tx);
    if (parseInt(oldProductId) !== parseInt(newProductId)) {
      await this.recalculateProductStock(newProductId, tx);
    }
  }

  /**
   * Called after an IntakeTransaction is marked as SOLD.
   * The intake is no longer PENDING, so the product stock decreases.
   */
  static async handleIntakeSold(productId, tx = prisma) {
    return this.recalculateProductStock(productId, tx);
  }

  /**
   * Called after an IntakeTransaction is deleted.
   * Recalculates the product stock to exclude the deleted intake.
   */
  static async handleIntakeDeleted(productId, tx = prisma) {
    return this.recalculateProductStock(productId, tx);
  }

  // ─────────────────────────────────────────────────────────────
  // Sales Lifecycle Events — NO-OP under current model
  //
  // IMPORTANT DESIGN NOTE:
  //   Under the current Inventory Philosophy, sales invoices are
  //   billing/accounting records. They do NOT directly mutate
  //   physical inventory. Inventory changes happen exclusively
  //   when an Intake transitions status (PENDING → SOLD).
  //
  //   These methods exist as documented extension points. If the
  //   business model changes in the future to require sales-driven
  //   inventory deduction, implement the logic HERE — not in
  //   SaleService directly.
  // ─────────────────────────────────────────────────────────────

  /**
   * Called after a new SaleTransaction is created.
   * Recalculates stock for affected products to capture initial stock consumption.
   */
  static async handleSaleCreated(processedItems, tx = prisma) {
    for (const item of processedItems) {
      await this.recalculateProductStock(item.productId, tx);
    }
  }

  /**
   * Called after a SaleTransaction is updated.
   * Recalculates stock for affected products using the product ID deltas key set.
   */
  static async handleSaleUpdated(deltas, tx = prisma) {
    for (const productId of deltas.keys()) {
      await this.recalculateProductStock(productId, tx);
    }
  }

  /**
   * Called after a SaleTransaction is deleted.
   * Recalculates stock for deleted items.
   */
  static async handleSaleDeleted(saleItems, tx = prisma) {
    for (const item of saleItems) {
      await this.recalculateProductStock(item.productId, tx);
    }
  }

  /**
   * Called after a SaleTransaction status is changed (e.g. CANCELLED, reactivated).
   * Recalculates stock for affected products.
   */
  static async handleSaleStatusUpdated(saleItems, _oldStatus, _newStatus, tx = prisma) {
    for (const item of saleItems) {
      await this.recalculateProductStock(item.productId, tx);
    }
  }
}
