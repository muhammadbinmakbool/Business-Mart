import { UNIT_CATEGORIES } from "./constants";
export { UNIT_CATEGORIES };



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
export function getUnitsByCategory(category) {
  return Object.values(UNITS).filter((u) => u.category === category);
}

/**
 * Checks if a unit is product-specific (requires product-level conversion factor).
 */
export function isProductSpecific(unitId) {
  return UNITS[unitId]?.productSpecific === true;
}

/**
 * Resolves the conversion factor for a unit given a product context.
 * Strict Rule: Hard fail on missing product-specific conversion.
 */
export function getConversionFactor(unitId, product) {
  const unit = UNITS[unitId];
  if (!unit) throw new Error(`Unit ${unitId} not found in registry`);

  // Global conversion (e.g. MAUND -> 40)
  if (unit.factor !== undefined) return unit.factor;

  // Product-specific conversion (e.g. BAG -> 50)
  if (unit.productSpecific) {
    const factor = Number(product?.unitConversion);
    if (!factor || factor <= 0) {
      throw new Error(`MISSING_CONVERSION: Unit ${unitId} is product-specific but no conversion factor is defined for product "${product?.name || 'Unknown'}"`);
    }
    return factor;
  }

  // Fallback to 1 (should be rare if registry is complete)
  return 1;
}

/**
 * Normalizes a quantity to base unit.
 * value: quantity in local unit
 */
export function normalizeQuantity(value, unitId, product) {
  if (value == null) return 0;
  const factor = getConversionFactor(unitId, product);
  return Number(value) * factor;
}

/**
 * Normalizes a rate (Rate per Unit -> Rate per Base Unit).
 * rate: price per local unit
 */
export function normalizeRate(rate, unitId, product) {
  if (rate == null) return 0;
  const factor = getConversionFactor(unitId, product);
  return Number(rate) / factor;
}

/**
 * Converts from base unit to local unit.
 */
export function convertFromBase(baseValue, targetUnitId, product) {
  if (baseValue == null) return 0;
  const factor = getConversionFactor(targetUnitId, product);
  return factor > 0 ? (Number(baseValue) / factor) : Number(baseValue);
}

/**
 * Calculates Net Weight, Bardana weight, and Khot weight from gross weight.
 * Orders of operations:
 * 1. Convert grossWeight to KG using centralized registry.
 * 2. Calculate Bardana: (bardanaGramPerBag * bagCount) / 1000 (in KG).
 * 3. Deduct Bardana from grossWeight to get weightAfterBardana.
 * 4. Convert weightAfterBardana to khotRateUnit and calculate Khot in KG using centralized registry.
 * 5. Deduct Khot from weightAfterBardana to get netWeight (in KG).
 * 6. Convert netWeight back to the original unit using centralized registry.
 */
export function calculateIntakeNetWeight({
  grossWeight,
  unit,
  bagCount = 0,
  bardanaGramPerBag = 0,
  khotRate = 0,
  khotRateUnit = "KG",
  product = null
}) {
  const gWeight = Number(grossWeight) || 0;
  const bCount = Number(bagCount) || 0;
  const bGram = Number(bardanaGramPerBag) || 0;
  const kRate = Number(khotRate) || 0;

  // 1. Gross weight in KG
  const grossWeightKg = normalizeQuantity(gWeight, unit, product);

  // 2. Bardana in KG
  const bardanaKg = bCount > 0 && bGram > 0 ? (bGram * bCount) / 1000 : 0;

  // 3. Weight after Bardana deduction (in KG)
  const weightAfterBardanaKg = Math.max(0, grossWeightKg - bardanaKg);

  // 4. Khot in KG
  // Applied weight for refraction is converted to the unit of the rate
  const khotAppliedWeight = convertFromBase(weightAfterBardanaKg, khotRateUnit, product);
  const khotKg = kRate > 0 ? (kRate * khotAppliedWeight) / 1000 : 0;

  // 5. Net weight in KG
  const netWeightKg = Math.max(0, weightAfterBardanaKg - khotKg);

  // 6. Net weight in original unit
  const netWeight = convertFromBase(netWeightKg, unit, product);

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
export function convertRate(rate, fromUnit, toUnit, product = null) {
  if (rate == null) return 0;
  if (fromUnit === toUnit) return Number(rate);
  
  // 1. Normalize local unit rate to base unit rate (e.g. rate per Maund -> rate per KG)
  const baseRate = normalizeRate(rate, fromUnit, product);
  
  // 2. Convert base rate to target unit rate
  const targetFactor = getConversionFactor(toUnit, product);
  return baseRate * targetFactor;
}
