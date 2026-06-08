import { UNITS, BASE_UNITS, getConversionFactor, normalizeQuantity, convertFromBase, normalizeRate } from "@/lib/units";

/**
 * UnitService — Architectural Proxy Layer
 * This service provides a backend-safe entry point for unit-related logic.
 * It delegates mathematical calculations to the core registry (units.js)
 * while maintaining compatibility with Product objects.
 */
export class UnitService {
  /**
   * Normalizes a quantity to the base unit of its category.
   * Delegates to the shared registry logic.
   */
  static getNormalizedQuantity(value, unitId, product) {
    return normalizeQuantity(value, unitId, product);
  }

  /**
   * Normalizes a rate (Rate per Unit -> Rate per Base Unit).
   */
  static getNormalizedRate(rate, unitId, product) {
    return normalizeRate(rate, unitId, product);
  }

  /**
   * Resolves the conversion factor for a unit.
   * Useful for financial normalization (rates).
   */
  static getConversionFactor(unitId, product) {
    return getConversionFactor(unitId, product);
  }

  /**
   * Validates if a unit is compatible with a product.
   * Enforces strict category matching.
   */
  static validateCompatibility(unitId, product) {
    const unit = UNITS[unitId];
    if (!unit) return { valid: false, error: `Invalid unit: ${unitId}` };

    if (unit.category !== product.category) {
      return { 
        valid: false, 
        error: `Unit ${unitId} (${unit.category}) is incompatible with product category (${product.category})` 
      };
    }

    if (unit.productSpecific && (!product.unitConversion || Number(product.unitConversion) <= 0)) {
      return { 
        valid: false, 
        error: `Product-specific conversion missing for ${unitId}. Please define it in Product settings.` 
      };
    }

    return { valid: true };
  }

  /**
   * Gets the base unit ID for a category.
   */
  static getBaseUnit(category) {
    return BASE_UNITS[category];
  }

  /**
   * Converts a normalized quantity back to a display quantity in a specific unit.
   */
  static getDisplayQuantity(normalizedValue, targetUnitId, product) {
    return convertFromBase(normalizedValue, targetUnitId, product);
  }
}
