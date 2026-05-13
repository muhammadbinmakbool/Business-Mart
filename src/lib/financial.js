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
 * @param {string} method - FIXED, PERCENTAGE, PER_WEIGHT
 * @param {number} value - The value of the adjustment
 * @param {object} context - { baseAmount, totalWeight }
 */
export function calculateAdjustment(method, value, { baseAmount = 0, totalWeight = 0 } = {}) {
  const val = Number(value);
  
  switch (method) {
    case "FIXED":
      return round(val);
    case "PERCENTAGE":
      return round((val / 100) * Number(baseAmount));
    case "PER_WEIGHT":
      return round(val * Number(totalWeight));
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
export function calculateFinalTotal(baseAmount, adjustments = [], totalWeight = 0) {
  const base = Number(baseAmount);
  
  const totalAdjustments = adjustments.reduce((acc, adj) => {
    const amt = calculateAdjustment(adj.method, adj.value, { baseAmount: base, totalWeight });
    return adj.direction === "SUBTRACT" ? acc - amt : acc + amt;
  }, 0);

  return {
    baseAmount: round(base),
    totalAdjustments: round(totalAdjustments),
    finalAmount: round(base + totalAdjustments)
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
