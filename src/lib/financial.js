import { getConversionFactor, convertRate } from "./units";
import { PAYMENT_STATUS } from "./constants";

// WARNING:
// This file must NEVER perform rounding.
// Rounding is handled ONLY in precision layer at output boundary.

/**
 * Financial Utilities
 * Centralized logic for all financial calculations in Business Mart.
 * Ensures consistency across Sales, Intakes, and future Ledger modules.
 */

/**
 * Rounds a number to a fixed number of decimal places.
 * Default is 2 decimal places for currency/weight.
 * 
 * NOTE: For compatibility with legacy UI consumers, this function is kept,
 * but it is NEVER used inside calculations in financial.js.
 */
export function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates the amount for an adjustment.
 * @param {string} method - FIXED, PERCENTAGE, PER_WEIGHT, PER_BAG, WEIGHT_PER_BAG
 * @param {number} value - The value of the adjustment
 * @param {object} context - { baseAmount, totalWeight, bagCount, rate, unit, product, adjustmentUnit }
 */
export function calculateAdjustment(method, value, { baseAmount = 0, totalWeight = 0, bagCount = 0, rate = 0, unit = "KG", product = null, adjustmentUnit = "KG" } = {}) {
  const val = Number(value);
  
  switch (method) {
    case "FIXED":
      return val;
    case "PERCENTAGE":
      return (val / 100) * Number(baseAmount);
    case "PER_WEIGHT": {
      const adjUnit = adjustmentUnit || "KG";
      if (adjUnit === "BAG") {
        return val * Number(bagCount);
      }
      // Convert weight in original unit (`unit`) to target unit (`adjUnit`)
      // 1. Convert to KG (base unit)
      const weightInKg = unit === "KG" ? Number(totalWeight) : Number(totalWeight) * getConversionFactor(unit, product);
      // 2. Convert to target unit
      const weightInTarget = adjUnit === "KG" ? weightInKg : weightInKg / getConversionFactor(adjUnit, product);
      return val * weightInTarget;
    }
    case "PER_BAG":
      return val * Number(bagCount);
    case "WEIGHT_PER_BAG":
      // Deducts a certain weight per bag (in KG), then multiplies by rate.
      // We convert the deducted weight from KG to the target unit by dividing by the conversion factor.
      const totalDeductedWeight = val * Number(bagCount);
      const factor = getConversionFactor(unit, product);
      const convertedWeight = totalDeductedWeight / factor;
      return convertedWeight * Number(rate);
    default:
      return 0;
  }
}


/**
 * Calculates the final total for a buyer/supplier flow.
 * @param {number} baseAmount - The base product amount
 * @param {Array} adjustments - Array of { method, value, direction, unit }
 * @param {number} totalWeight - Total weight of products
 */
export function calculateFinalTotal(baseAmount, adjustments = [], totalWeight = 0, bagCount = 0, rate = 0, unit = "KG", product = null) {
  const base = Number(baseAmount);
  
  const totalAdjustments = adjustments.reduce((acc, adj) => {
    const amt = calculateAdjustment(adj.method, adj.value, { 
      baseAmount: base, 
      totalWeight, 
      bagCount, 
      rate,
      unit,
      product,
      adjustmentUnit: adj.unit
    });
    return adj.direction === "SUBTRACT" ? acc - amt : acc + amt;
  }, 0);

  return {
    baseAmount: base,
    totalAdjustments: totalAdjustments,
    finalAmount: base + totalAdjustments
  };
}

/**
 * ARCHITECTURAL LOCK: Single Source of Truth for Transaction Calculations.
 * Both UI and Backend must use this logic.
 * @param {Array} items - Array of { normalizedWeight, normalizedRate, product }
 * @param {Array} adjustments - Array of adjustments
 */
export function calculateTransactionTotals(items = [], adjustments = []) {
  // 1. Calculate Base Amount using strictly normalized values
  let baseAmount = 0;
  let totalWeight = 0;
  let totalBagCount = 0;

  items.forEach(item => {
    const itemWeight = Number(item.normalizedWeight || 0);
    const itemRate = Number(item.normalizedRate || 0);
    
    baseAmount += (itemWeight * itemRate);
    totalWeight += itemWeight;

    if (item.product) {
      try {
        const bagFactor = getConversionFactor("BAG", item.product);
        if (bagFactor > 0) {
          totalBagCount += itemWeight / bagFactor;
        }
      } catch (e) {
        // Fallback or ignore if BAG conversion is not supported
      }
    }
  });

  // 2. Apply Adjustments
  const result = calculateFinalTotal(baseAmount, adjustments, totalWeight, totalBagCount, 0, "KG", null);

  return {
    ...result,
    totalWeight: totalWeight,
    totalBagCount: totalBagCount
  };
}

export function calculateSupplierDeductions(intakes) {
  let totalGrossValue = 0;
  let totalDeductions = 0;

  const intakeBreakdowns = intakes.map(intake => {
    const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
    const actualRate = convertRate(intake.rate, intake.rateUnit || "KG", intake.unit || "KG", intake.product);
    const gross = billingWeight * Number(actualRate || 0);
    totalGrossValue += gross;

    const context = { 
      baseAmount: gross, 
      totalWeight: billingWeight, 
      bagCount: intake.bagCount || 0,
      rate: Number(actualRate || 0),
      unit: intake.unit || "KG",
      product: intake.product || null
    };

    let itemDeductions = 0;
    const itemAdjustments = intake.adjustments || [];
    const calculatedAdjs = itemAdjustments.map(adj => {
      const amt = calculateAdjustment(adj.method, adj.value, {
        ...context,
        adjustmentUnit: adj.unit
      });
      if (adj.direction === "SUBTRACT") {
        itemDeductions += amt;
      } else {
        itemDeductions -= amt;
      }
      return {
        adjustmentType: adj.adjustmentType,
        method: adj.method,
        value: Number(adj.value),
        direction: adj.direction,
        unit: adj.unit || null,
        calculatedAmount: amt
      };
    });

    totalDeductions += itemDeductions;

    return {
      intakeId: intake.id,
      gross: gross,
      deductions: itemDeductions,
      net: gross - itemDeductions,
      adjustments: calculatedAdjs
    };
  });

  return {
    totalGrossValue: totalGrossValue,
    totalDeductions: totalDeductions,
    netValue: totalGrossValue - totalDeductions,
    intakeBreakdowns
  };
}

export function roundWeight(weight) {
  return round(weight, 2);
}

export function roundRate(rate) {
  return round(rate, 2);
}

/**
 * Single Source of Truth for Invoicing Payments & Clearing Math.
 * Determines the clearing state, remaining amount, and clearance status.
 *
 * @param {number|Decimal} totalAmount - Invoice total gross or net final amount
 * @param {number|Decimal} paidAmount - Total amount paid/allocated so far
 * @returns {{
 *   total: number,
 *   paid: number,
 *   remaining: number,
 *   paymentStatus: string,
 *   isCleared: boolean
 * }}
 */
export function calculateInvoiceClearingState(totalAmount, paidAmount) {
  const total = Number(totalAmount || 0);
  const paid = Number(paidAmount || 0);
  const remaining = Math.max(0, total - paid);
  
  let paymentStatus = PAYMENT_STATUS.PENDING;
  let isCleared = false;
  
  if (paid >= total) {
    paymentStatus = PAYMENT_STATUS.CLEARED;
    isCleared = true;
  } else if (paid > 0) {
    paymentStatus = PAYMENT_STATUS.PARTIAL;
  }
  
  return {
    total,
    paid,
    remaining,
    paymentStatus,
    isCleared
  };
}
