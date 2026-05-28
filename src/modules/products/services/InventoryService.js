import { prisma } from "@/lib/prisma";
import { UnitService } from "./UnitService";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * InventoryService — Unified Inventory State Manager
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * INVENTORY PHILOSOPHY:
 *   Physical inventory is controlled exclusively through the Intake lifecycle.
 *   - PENDING intake  = stock physically available in the warehouse.
 *   - PARTIAL intake  = stock partially consumed, remaining is physically available.
 *   - SOLD intake     = stock allocated/sold — removed from available inventory.
 *   - CANCELLED intake= excluded from inventory entirely.
 *
 *   Sales invoices are billing/accounting records and do NOT directly mutate
 *   inventory. Inventory movement happens at Intake status transition, NOT
 *   at billing/sales stage.
 *
 * STOCK CALCULATION:
 *   Product.quantity = SUM(normalized remaining weight) of all IntakeTransactions
 *                      WHERE productId matches AND status in ["PENDING", "PARTIAL"]
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
   * Stock = SUM(normalized remaining weight) of active intakes for this product.
   *
   * @param {number} productId - The product ID to recalculate.
   * @param {object} [tx=prisma] - Prisma transaction client (or default prisma).
   */
  static async recalculateProductStock(productId, tx = prisma) {
    const activeIntakes = await tx.intakeTransaction.findMany({
      where: {
        productId: parseInt(productId),
        status: { in: ["PENDING", "PARTIAL"] },
      },
      include: {
        product: true
      }
    });

    let totalNormalizedRemaining = 0;
    for (const intake of activeIntakes) {
      const remaining = Number(intake.remainingWeight !== null && intake.remainingWeight !== undefined ? intake.remainingWeight : intake.grossWeight);
      const normalizedRemaining = UnitService.getNormalizedQuantity(remaining, intake.unit, intake.product);
      totalNormalizedRemaining += normalizedRemaining;
    }

    await tx.product.update({
      where: { id: parseInt(productId) },
      data: { quantity: totalNormalizedRemaining },
    });

    return totalNormalizedRemaining;
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
   * NO-OP: Sales do not affect inventory under the current model.
   */
  static async handleSaleCreated(_processedItems, _tx = prisma) {
    // No-op: Inventory is driven by Intake lifecycle, not sales billing.
  }

  /**
   * Called after a SaleTransaction is updated.
   * NO-OP: Sales do not affect inventory under the current model.
   */
  static async handleSaleUpdated(_deltas, _tx = prisma) {
    // No-op: Inventory is driven by Intake lifecycle, not sales billing.
  }

  /**
   * Called after a SaleTransaction is deleted.
   * NO-OP: Sales do not affect inventory under the current model.
   */
  static async handleSaleDeleted(_saleItems, _tx = prisma) {
    // No-op: Inventory is driven by Intake lifecycle, not sales billing.
  }

  /**
   * Called after a SaleTransaction status is changed (e.g. CANCELLED, reactivated).
   * NO-OP: Sales do not affect inventory under the current model.
   */
  static async handleSaleStatusUpdated(_saleItems, _oldStatus, _newStatus, _tx = prisma) {
    // No-op: Inventory is driven by Intake lifecycle, not sales billing.
  }
}
