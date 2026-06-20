import { UNIT_CATEGORIES } from "./constants";
export { UNIT_CATEGORIES };

export const UNIT_IDS = {
  KG: "KG",
  MAUND: "MAUND",
  TON: "TON",
  BAG: "BAG",
  ML: "ML",
  LITER: "LITER",
  PIECE: "PIECE",
  PACK: "PACK",
  BOX: "BOX"
};

export const DEFAULT_WEIGHT_UNIT = UNIT_IDS.KG;

export const UNIT_ABBREVIATIONS = {
  [UNIT_IDS.KG]: "KG",
  [UNIT_IDS.MAUND]: "MND",
  [UNIT_IDS.TON]: "TON",
  [UNIT_IDS.BAG]: "BAG",
  [UNIT_IDS.ML]: "ML",
  [UNIT_IDS.LITER]: "LTR",
  [UNIT_IDS.PIECE]: "PCS",
  [UNIT_IDS.PACK]: "PCK",
  [UNIT_IDS.BOX]: "BOX"
};

export function getUnitLabel(unitId) {
  return UNIT_ABBREVIATIONS[unitId] || unitId;
}

export const UNITS = {
  // WEIGHT CATEGORY
  KG: { 
    id: "KG", 
    name: "Kilogram", 
    category: UNIT_CATEGORIES.WEIGHT, 
    base: true, 
    factor: 1 
  },
  MAUND: { 
    id: "MAUND", 
    name: "Maund", 
    category: UNIT_CATEGORIES.WEIGHT, 
    factor: 40 
  },
  TON: { 
    id: "TON", 
    name: "Ton", 
    category: UNIT_CATEGORIES.WEIGHT, 
    factor: 1000 
  },
  G: { 
    id: "G", 
    name: "Gram", 
    category: UNIT_CATEGORIES.WEIGHT, 
    factor: 0.001 
  },
  BAG: { 
    id: "BAG", 
    name: "Bag", 
    category: UNIT_CATEGORIES.WEIGHT, 
    productSpecific: true 
  },

  // LIQUID CATEGORY
  ML: { 
    id: "ML", 
    name: "Milliliter", 
    category: UNIT_CATEGORIES.LIQUID, 
    base: true, 
    factor: 1 
  },
  LITER: { 
    id: "LITER", 
    name: "Liter", 
    category: UNIT_CATEGORIES.LIQUID, 
    factor: 1000 
  },

  // QUANTITY CATEGORY
  PIECE: { 
    id: "PIECE", 
    name: "Piece", 
    category: UNIT_CATEGORIES.QUANTITY, 
    base: true, 
    factor: 1 
  },
  PACK: { 
    id: "PACK", 
    name: "Pack", 
    category: UNIT_CATEGORIES.QUANTITY, 
    base: false,
    productSpecific: true 
  },
  BOX: { 
    id: "BOX", 
    name: "Box", 
    category: UNIT_CATEGORIES.QUANTITY, 
    base: false,
    productSpecific: true 
  },
};

export const BASE_UNITS = {
  [UNIT_CATEGORIES.WEIGHT]: "KG",
  [UNIT_CATEGORIES.LIQUID]: "ML",
  [UNIT_CATEGORIES.QUANTITY]: "PIECE",
};

/**
 * Gets units belonging to a specific category.
 */
export function getUnitsByCategory(category, unitRegistry) {
  const source = unitRegistry || UNITS;
  return Object.values(source).filter((u) => (u.unitCategoryCode || u.category) === category);
}

/**
 * Checks if a unit is product-specific (requires product-level conversion factor).
 */
export function isProductSpecific(unitId, unitRegistry) {
  const source = unitRegistry || UNITS;
  return source[unitId]?.isCustom === true || source[unitId]?.productSpecific === true;
}

/**
 * Resolves the conversion factor for a unit given a product context.
 * Strict Rule: Hard fail on missing product-specific conversion.
 */
export function getConversionFactor(unitId, product, unitRegistry) {
  const source = unitRegistry || UNITS;
  const unit = source[unitId];
  if (!unit) throw new Error(`Unit ${unitId} not found in registry`);

  // Product-specific / Custom conversion (e.g. BAG -> 50)
  if (unit.isCustom || unit.productSpecific) {
    const factor = Number(product?.unitConversion);
    if (!factor || factor <= 0) {
      throw new Error(`MISSING_CONVERSION: Unit ${unitId} is product-specific but no conversion factor is defined for product "${product?.name || 'Unknown'}"`);
    }
    return factor;
  }

  // Global conversion (e.g. MAUND -> 40)
  const rate = unit.conversionRate !== undefined ? unit.conversionRate : unit.factor;
  if (rate !== undefined && rate !== null) return Number(rate);

  // Fallback to 1 (should be rare if registry is complete)
  return 1;
}

/**
 * Normalizes a quantity to base unit.
 * value: quantity in local unit
 */
export function normalizeQuantity(value, unitId, product, unitRegistry) {
  if (value == null) return 0;
  const factor = getConversionFactor(unitId, product, unitRegistry);
  return Number(value) * factor;
}

/**
 * Normalizes a rate (Rate per Unit -> Rate per Base Unit).
 * rate: price per local unit
 */
export function normalizeRate(rate, unitId, product, unitRegistry) {
  if (rate == null) return 0;
  const factor = getConversionFactor(unitId, product, unitRegistry);
  return Number(rate) / factor;
}

/**
 * Converts from base unit to local unit.
 */
export function convertFromBase(baseValue, targetUnitId, product, unitRegistry) {
  if (baseValue == null) return 0;
  const factor = getConversionFactor(targetUnitId, product, unitRegistry);
  return factor > 0 ? (Number(baseValue) / factor) : Number(baseValue);
}

/**
 * Calculates Net Weight, Bardana weight, and Khot weight from gross weight.
 */
export function calculateIntakeNetWeight({
  grossWeight,
  unit,
  bagCount = 0,
  bardanaGramPerBag = 0,
  khotRate = 0,
  khotRateUnit = "KG",
  product = null,
  unitRegistry = null
}) {
  const gWeight = Number(grossWeight) || 0;
  const bCount = Number(bagCount) || 0;
  const bGram = Number(bardanaGramPerBag) || 0;
  const kRate = Number(khotRate) || 0;

  // 1. Gross weight in KG
  const grossWeightKg = normalizeQuantity(gWeight, unit, product, unitRegistry);

  // 2. Bardana in KG
  const bardanaKg = bCount > 0 && bGram > 0 ? (bGram * bCount) / 1000 : 0;

  // 3. Weight after Bardana deduction (in KG)
  const weightAfterBardanaKg = Math.max(0, grossWeightKg - bardanaKg);

  // 4. Khot in KG
  // Applied weight for refraction is converted to the unit of the rate
  const khotAppliedWeight = convertFromBase(weightAfterBardanaKg, khotRateUnit, product, unitRegistry);
  const khotKg = kRate > 0 ? (kRate * khotAppliedWeight) / 1000 : 0;

  // 5. Net weight in KG
  const netWeightKg = Math.max(0, weightAfterBardanaKg - khotKg);

  // 6. Net weight in original unit
  const netWeight = convertFromBase(netWeightKg, unit, product, unitRegistry);

  return {
    grossWeightKg,
    bardanaKg,
    khotKg,
    netWeightKg,
    netWeight
  };
}

/**
 * Converts a rate from a source unit to a target unit.
 * E.g. converts rate per KG to rate per Maund, or rate per Maund to rate per KG.
 */
export function convertRate(rate, fromUnit, toUnit, product = null, unitRegistry) {
  if (rate == null) return 0;
  if (fromUnit === toUnit) return Number(rate);
  
  // 1. Normalize local unit rate to base unit rate (e.g. rate per Maund -> rate per KG)
  const baseRate = normalizeRate(rate, fromUnit, product, unitRegistry);
  
  // 2. Convert base rate to target unit rate
  const targetFactor = getConversionFactor(toUnit, product, unitRegistry);
  return baseRate * targetFactor;
}

/**
 * Checks if a unit ID belongs to a given unit category.
 */
export function isUnitCompatible(unitId, unitCategory, unitRegistry) {
  if (!unitId || !unitCategory) return false;
  const source = unitRegistry || UNITS;
  const unit = source[unitId];
  return (unit?.unitCategoryCode || unit?.category) === unitCategory;
}

/**
 * Resolves the ordered hierarchy list of unit codes dynamically from the database/registry.
 */
export function getDynamicHierarchy(category, product = null, unitRegistry = null) {
  if (product && product.unitHierarchy) {
    if (Array.isArray(product.unitHierarchy)) return product.unitHierarchy;
    if (typeof product.unitHierarchy === "string") {
      return product.unitHierarchy.split(",").map((u) => u.trim());
    }
  }

  const source = unitRegistry || UNITS;
  
  // 1. Get all units in the category
  const categoryUnits = Object.values(source).filter(
    (u) => (u.unitCategoryCode || u.category) === category
  );
  
  // 2. Map to their resolved conversion factors
  const resolvedUnits = categoryUnits.map((u) => {
    let factor = 0;
    const unitCode = u.code || u.id;
    try {
      factor = getConversionFactor(unitCode, product, source);
    } catch (err) {
      factor = u.conversionRate !== undefined && u.conversionRate !== null 
        ? Number(u.conversionRate) 
        : Number(u.factor || 0);
    }
    return { code: unitCode, factor };
  });
  
  // 3. Filter units that resolved to a valid factor > 0
  const validUnits = resolvedUnits.filter((u) => u.factor > 0);
  
  // 4. Sort descending by conversion factor
  validUnits.sort((a, b) => b.factor - a.factor);
  
  return validUnits.map((u) => u.code);
}

/**
 * Decomposes a quantity into a primary and immediately next lower unit dynamically (Pure Math).
 * Returns { value, unit, secondaryValue?, secondaryUnit? }
 */
export function decomposeQuantity(quantity, unitId, product = null, unitRegistry = null) {
  if (quantity == null || isNaN(quantity)) {
    return { value: 0, unit: unitId };
  }

  const source = unitRegistry || UNITS;
  const unitObj = source[unitId];
  if (!unitObj) {
    return { value: Number(quantity), unit: unitId };
  }

  const category = unitObj.unitCategoryCode || unitObj.category;
  if (!category) {
    return { value: Number(quantity), unit: unitId };
  }

  // Get dynamic hierarchy
  const hierarchy = getDynamicHierarchy(category, product, source);

  // Find index of the unit in the hierarchy
  const index = hierarchy.indexOf(unitId);
  if (index === -1 || index === hierarchy.length - 1) {
    return { value: Number(quantity), unit: unitId };
  }

  const nextUnitId = hierarchy[index + 1];

  // Resolve factors
  let factorCurrent = 0;
  let factorNext = 0;
  try {
    factorCurrent = getConversionFactor(unitId, product, source);
    factorNext = getConversionFactor(nextUnitId, product, source);
  } catch (err) {
    return { value: Number(quantity), unit: unitId };
  }

  if (!factorCurrent || !factorNext || factorCurrent <= 0 || factorNext <= 0) {
    return { value: Number(quantity), unit: unitId };
  }

  const rawVal = Number(quantity);
  const wholeVal = Math.floor(rawVal);
  const fraction = rawVal - wholeVal;

  if (fraction < 1e-9) {
    return { value: wholeVal, unit: unitId };
  }

  // Convert decimal part to the next lower unit
  const nextRawVal = fraction * (factorCurrent / factorNext);
  const nextWholeVal = Math.round(nextRawVal * 1000) / 1000;

  if (nextWholeVal === 0) {
    return { value: wholeVal, unit: unitId };
  }

  const ratio = factorCurrent / factorNext;
  if (nextWholeVal >= ratio - 1e-9) {
    return { value: wholeVal + 1, unit: unitId };
  }

  return {
    value: wholeVal,
    unit: unitId,
    secondaryValue: nextWholeVal,
    secondaryUnit: nextUnitId
  };
}

