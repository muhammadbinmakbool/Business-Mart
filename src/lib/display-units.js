import { convertFromBase, convertRate } from "./units";

export const PREFERENCE_KEYS = {
  WEIGHT_UNIT: "pref_weight_display_unit",
  RATE_UNIT: "pref_rate_display_unit",
};

/**
 * Resolves current preferred UI weight display unit.
 * Centralized localStorage abstraction (client-safe).
 */
export function getPreferredWeightUnit() {
  if (typeof window === "undefined") return "KG";
  try {
    return window.localStorage.getItem(PREFERENCE_KEYS.WEIGHT_UNIT) || "KG";
  } catch (e) {
    return "KG";
  }
}

/**
 * Resolves current preferred UI rate display unit.
 * Centralized localStorage abstraction (client-safe).
 */
export function getPreferredRateUnit() {
  if (typeof window === "undefined") return "KG";
  try {
    return window.localStorage.getItem(PREFERENCE_KEYS.RATE_UNIT) || "KG";
  } catch (e) {
    return "KG";
  }
}

/**
 * Persists preferred UI weight display unit.
 */
export function setPreferredWeightUnit(unit) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PREFERENCE_KEYS.WEIGHT_UNIT, unit);
    } catch (e) {
      console.error("Failed to save preferred weight unit", e);
    }
  }
}

/**
 * Persists preferred UI rate display unit.
 */
export function setPreferredRateUnit(unit) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PREFERENCE_KEYS.RATE_UNIT, unit);
    } catch (e) {
      console.error("Failed to save preferred rate unit", e);
    }
  }
}

/**
 * Formats weight value for invoice-entry input defaults.
 * Purely presentation wrapper.
 */
export function formatWeightForInputUI(value, product) {
  const targetUnit = getPreferredWeightUnit();
  const converted = convertFromBase(value, targetUnit, product);
  return {
    value: converted,
    unit: targetUnit === "MAUND" ? "MND" : targetUnit
  };
}

/**
 * Formats rate value for invoice-entry input defaults.
 * Purely presentation wrapper.
 */
export function formatRateForInputUI(rate, product) {
  const targetUnit = getPreferredRateUnit();
  const converted = convertRate(rate, "KG", targetUnit, product);
  return {
    value: converted,
    unit: targetUnit === "MAUND" ? "MND" : targetUnit
  };
}
