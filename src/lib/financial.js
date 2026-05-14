/**
 * Financial Utilities
 * Centralized logic for all financial calculations in Business Mart.
 * Ensures consistency across Sales, Intakes, and future Ledger modules.
 */

/**
 * Rounds a number to a fixed number of decimal places.
 * Default is 2 decimal places for currency/weight.
 */
export function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates the amount for an adjustment.
 * @param {string} method - FIXED, PERCENTAGE, PER_WEIGHT, PER_BAG, WEIGHT_PER_BAG
 * @param {number} value - The value of the adjustment
 * @param {object} context - { baseAmount, totalWeight, bagCount, rate }
 */
export function calculateAdjustment(method, value, { baseAmount = 0, totalWeight = 0, bagCount = 0, rate = 0 } = {}) {
  const val = Number(value);
  
  switch (method) {
    case "FIXED":
      return round(val);
    case "PERCENTAGE":
      return round((val / 100) * Number(baseAmount));
    case "PER_WEIGHT":
      return round(val * Number(totalWeight));
    case "PER_BAG":
      return round(val * Number(bagCount));
    case "WEIGHT_PER_BAG":
      // Deducts a certain weight per bag, then multiplies by rate
      return round(val * Number(bagCount) * Number(rate));
    default:
      return 0;
  }
}

/**
 * Calculates the final total for a buyer/supplier flow.
 * @param {number} baseAmount - The base product amount
 * @param {Array} adjustments - Array of { method, value, direction }
 * @param {number} totalWeight - Total weight of products
 */
export function calculateFinalTotal(baseAmount, adjustments = [], totalWeight = 0, bagCount = 0, rate = 0) {
  const base = Number(baseAmount);
  
  const totalAdjustments = adjustments.reduce((acc, adj) => {
    const amt = calculateAdjustment(adj.method, adj.value, { baseAmount: base, totalWeight, bagCount, rate });
    return adj.direction === "SUBTRACT" ? acc - amt : acc + amt;
  }, 0);

  return {
    baseAmount: round(base),
    totalAdjustments: round(totalAdjustments),
    finalAmount: round(base + totalAdjustments)
  };
}

/**
 * Calculates deductions and totals for a supplier settlement.
 * @param {Array} intakes - Array of intake records with grossWeight, bagCount, rate
 * @param {Object} config - Deductions configuration { kaat: { method, value }, brokerage: { method, value } }
 */
export function calculateSupplierDeductions(intakes, config = {}) {
  let totalGrossValue = 0;
  let totalDeductions = 0;

  intakes.forEach(intake => {
    const gross = Number(intake.grossWeight) * Number(intake.rate);
    totalGrossValue += gross;

    const context = { 
      baseAmount: gross, 
      totalWeight: intake.grossWeight, 
      bagCount: intake.bagCount || 0,
      rate: intake.rate
    };

    // Kaat
    if (config.kaat) {
      totalDeductions += calculateAdjustment(config.kaat.method, config.kaat.value, context);
    }

    // Brokerage
    if (config.brokerage) {
      totalDeductions += calculateAdjustment(config.brokerage.method, config.brokerage.value, context);
    }
  });

  return {
    totalGrossValue: round(totalGrossValue),
    totalDeductions: round(totalDeductions),
    netValue: round(totalGrossValue - totalDeductions)
  };
}

/**
 * Standard rounding for Weights (often 2 decimals in this system)
 */
export function roundWeight(weight) {
  return round(weight, 2);
}

/**
 * Standard rounding for Rates/Prices
 */
export function roundRate(rate) {
  return round(rate, 2);
}
