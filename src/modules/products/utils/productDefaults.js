import { isUnitCompatible, BASE_UNITS } from "@/lib/units";

/**
 * Pure function to resolve default rates and units for a product given a context and session memory.
 * No side effects, no database queries.
 *
 * @param {Object} product - Product record
 * @param {Object} sessionMemory - Last used values from client
 * @param {string} context - 'sale' or 'intake'
 * @returns {Object} { unit, rateUnit, rate }
 */
export function resolveProductDefaults(product, sessionMemory = {}, context = "sale") {
  if (!product) return null;

  const unitCategory = product.unitCategory || "WEIGHT";
  const isSale = context === "sale";

  // 1. Resolve Quantity Unit
  let resolvedUnit = null;

  // Priority 2: Session Memory
  if (sessionMemory.lastUnit && isUnitCompatible(sessionMemory.lastUnit, unitCategory)) {
    resolvedUnit = sessionMemory.lastUnit;
  }

  // Priority 3: Product Defaults
  if (!resolvedUnit && isSale && product.defaultSellingUnit && isUnitCompatible(product.defaultSellingUnit, unitCategory)) {
    resolvedUnit = product.defaultSellingUnit;
  }
  if (!resolvedUnit && product.primaryUnit && isUnitCompatible(product.primaryUnit, unitCategory)) {
    resolvedUnit = product.primaryUnit;
  }

  // Priority 4: System Fallback
  if (!resolvedUnit) {
    resolvedUnit = BASE_UNITS[unitCategory] || "KG";
  }

  // 2. Resolve Rate Unit
  let resolvedRateUnit = null;

  // Priority 2: Session Memory
  if (sessionMemory.lastRateUnit && isUnitCompatible(sessionMemory.lastRateUnit, unitCategory)) {
    resolvedRateUnit = sessionMemory.lastRateUnit;
  }

  // Priority 3: Product Defaults
  const defaultRateUnit = isSale ? product.sellingRateUnit : product.buyingRateUnit;
  if (!resolvedRateUnit && defaultRateUnit && isUnitCompatible(defaultRateUnit, unitCategory)) {
    resolvedRateUnit = defaultRateUnit;
  }

  // Priority 4: Fallback to resolved quantity unit
  if (!resolvedRateUnit) {
    resolvedRateUnit = resolvedUnit;
  }

  // 3. Resolve Rate
  let resolvedRate = 0;

  // Priority 2: Session Memory (if it exists and is a positive number)
  if (sessionMemory.lastRate !== undefined && sessionMemory.lastRate !== null && sessionMemory.lastRate !== "" && Number(sessionMemory.lastRate) > 0) {
    resolvedRate = Number(sessionMemory.lastRate);
  } else {
    // Priority 3: Product Defaults
    const defaultRate = isSale ? product.defaultSellingRate : product.defaultBuyingRate;
    if (defaultRate !== undefined && defaultRate !== null) {
      resolvedRate = Number(defaultRate);
    }
  }

  return {
    unit: resolvedUnit,
    rateUnit: resolvedRateUnit,
    rate: resolvedRate,
  };
}
