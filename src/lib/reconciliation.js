/**
 * Reconciliation Utilities
 * Central source of truth for Ledger & Reconciliation calculations.
 * Avoids duplication of formulas across controllers, UI, and reports.
 */

import { round } from "./financial";

export const DEFAULT_TOLERANCE = 1.00;

/**
 * Calculates supplier-side totals from active (non-superseded) supplier invoices.
 * Active check is performed inside the function to ensure consistency.
 *
 * Formula:
 * Supplier Base Amount = totalGrossValue
 * Supplier Net Settled Value = totalGrossValue - totalDeductions (which equals finalPayableAmount + totalAdvances)
 *
 * @param {Array} invoices - Raw list of supplier invoices
 */
export function calculateSupplierTotals(invoices = []) {
  const activeInvoices = invoices.filter(inv => inv.status !== "SUPERSEDED");

  let totalGross = 0;
  let totalDeductions = 0;
  let totalAdvances = 0;
  let finalPayableAmount = 0;

  activeInvoices.forEach(inv => {
    totalGross += Number(inv.totalGrossValue || 0);
    totalDeductions += Number(inv.totalDeductions || 0);
    totalAdvances += Number(inv.totalAdvances || 0);
    finalPayableAmount += Number(inv.finalPayableAmount || 0);
  });

  return {
    gross: round(totalGross),
    deductions: round(totalDeductions),
    advances: round(totalAdvances),
    finalPayable: round(finalPayableAmount),
    // Base amount is Gross before deductions/adjustments on supplier side
    baseTotal: round(totalGross),
    activeCount: activeInvoices.length,
  };
}

/**
 * Calculates buyer-side totals from active (non-deleted, non-cancelled) sale transactions.
 * Active check is performed inside the function to ensure consistency.
 *
 * Formula:
 * Buyer Base Amount = baseAmount (which is finalAmount - totalAdjustments)
 *
 * @param {Array} sales - Raw list of sale transactions
 */
export function calculateBuyerTotals(sales = []) {
  const activeSales = sales.filter(sale => !sale.isDeleted && sale.status !== "CANCELLED");

  let baseAmount = 0;
  let totalAdjustments = 0;
  let finalAmount = 0;

  activeSales.forEach(sale => {
    baseAmount += Number(sale.baseAmount || 0);
    totalAdjustments += Number(sale.totalAdjustments || 0);
    finalAmount += Number(sale.finalAmount || 0);
  });

  return {
    base: round(baseAmount),
    adjustments: round(totalAdjustments),
    final: round(finalAmount),
    // Base amount is Base before adjustments on buyer side
    baseTotal: round(baseAmount),
    activeCount: activeSales.length,
  };
}

/**
 * Calculates the difference between Buyer Base Total and Supplier Base Total.
 */
export function calculateReconciliationDifference(supplierBase, buyerBase) {
  return round(Number(buyerBase) - Number(supplierBase));
}

/**
 * Checks if the difference is within the configurable tolerance.
 */
export function isReconciliationMatched(supplierBase, buyerBase, tolerance = DEFAULT_TOLERANCE) {
  const diff = Math.abs(calculateReconciliationDifference(supplierBase, buyerBase));
  return diff <= Number(tolerance);
}

/**
 * Returns a comprehensive reconciliation summary of active invoices and sales.
 */
export function calculateReconciliationSummary(invoices = [], sales = [], tolerance = DEFAULT_TOLERANCE) {
  const supplierTotals = calculateSupplierTotals(invoices);
  const buyerTotals = calculateBuyerTotals(sales);

  const difference = calculateReconciliationDifference(supplierTotals.baseTotal, buyerTotals.baseTotal);
  const matched = isReconciliationMatched(supplierTotals.baseTotal, buyerTotals.baseTotal, tolerance);

  return {
    supplier: supplierTotals,
    buyer: buyerTotals,
    difference,
    matched,
    tolerance: Number(tolerance),
  };
}
