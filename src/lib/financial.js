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
export function calculateAdjustment(method, value, { baseAmount = 0, totalWeight = 0, bagCount = 0, rate = 0, unit = "KG" } = {}) {
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
      // Deducts a certain weight per bag (in KG), then multiplies by rate.
      // If unit is MAUND, we must convert the deducted weight from KG to Maund by dividing by 40!
      const totalDeductedWeight = val * Number(bagCount);
      const convertedWeight = unit === "MAUND" ? totalDeductedWeight / 40 : totalDeductedWeight;
      return round(convertedWeight * Number(rate));
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
 * ARCHITECTURAL LOCK: Single Source of Truth for Transaction Calculations.
 * Both UI and Backend must use this logic.
 * @param {Array} items - Array of { normalizedWeight, normalizedRate }
 * @param {Array} adjustments - Array of adjustments
 */
export function calculateTransactionTotals(items = [], adjustments = []) {
  // 1. Calculate Base Amount using strictly normalized values
  let baseAmount = 0;
  let totalWeight = 0;

  items.forEach(item => {
    const itemWeight = Number(item.normalizedWeight || 0);
    const itemRate = Number(item.normalizedRate || 0);
    
    baseAmount += round(itemWeight * itemRate);
    totalWeight += itemWeight;
  });

  // 2. Apply Adjustments
  const result = calculateFinalTotal(baseAmount, adjustments, totalWeight);

  return {
    ...result,
    totalWeight: round(totalWeight)
  };
}

export function calculateSupplierDeductions(intakes) {
  let totalGrossValue = 0;
  let totalDeductions = 0;

  const intakeBreakdowns = intakes.map(intake => {
    const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
    const gross = billingWeight * Number(intake.rate || 0);
    totalGrossValue += gross;

    const context = { 
      baseAmount: gross, 
      totalWeight: billingWeight, 
      bagCount: intake.bagCount || 0,
      rate: Number(intake.rate || 0),
      unit: intake.unit || "KG"
    };

    let itemDeductions = 0;
    const itemAdjustments = intake.adjustments || [];
    const calculatedAdjs = itemAdjustments.map(adj => {
      const amt = calculateAdjustment(adj.method, adj.value, context);
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
        calculatedAmount: amt
      };
    });

    totalDeductions += itemDeductions;

    return {
      intakeId: intake.id,
      gross: round(gross),
      deductions: round(itemDeductions),
      net: round(gross - itemDeductions),
      adjustments: calculatedAdjs
    };
  });

  return {
    totalGrossValue: round(totalGrossValue),
    totalDeductions: round(totalDeductions),
    netValue: round(totalGrossValue - totalDeductions),
    intakeBreakdowns
  };
}

export function roundWeight(weight) {
  return round(weight, 2);
}

export function roundRate(rate) {
  return round(rate, 2);
}
