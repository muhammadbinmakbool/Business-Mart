import { convertFromBase, convertRate, UNIT_IDS, getUnitLabel, DEFAULT_WEIGHT_UNIT } from "./units";

export const PREFERENCE_KEYS = {
  WEIGHT_UNIT: "pref_weight_display_unit",
  RATE_UNIT: "pref_rate_display_unit",
};

/**
 * Resolves current preferred UI weight display unit.
 * Centralized localStorage abstraction (client-safe).
 */
export function getPreferredWeightUnit() {
  if (typeof window === "undefined") return DEFAULT_WEIGHT_UNIT;
  try {
    return window.localStorage.getItem(PREFERENCE_KEYS.WEIGHT_UNIT) || DEFAULT_WEIGHT_UNIT;
  } catch (e) {
    return DEFAULT_WEIGHT_UNIT;
  }
}

/**
 * Resolves current preferred UI rate display unit.
 * Centralized localStorage abstraction (client-safe).
 */
export function getPreferredRateUnit() {
  if (typeof window === "undefined") return DEFAULT_WEIGHT_UNIT;
  try {
    return window.localStorage.getItem(PREFERENCE_KEYS.RATE_UNIT) || DEFAULT_WEIGHT_UNIT;
  } catch (e) {
    return DEFAULT_WEIGHT_UNIT;
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
    unit: getUnitLabel(targetUnit)
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
    unit: getUnitLabel(targetUnit)
  };
}

/**
 * Formats a Maund weight into a beautiful whole Maund and fractional Kg format (e.g. 40.5 Maund -> 40 MND 20 KG)
 * only if there is a fractional part.
 */
export function formatMaundWeight(value, labelMaund = "MND", labelKg = "KG") {
  const val = Number(value);
  if (isNaN(val) || val <= 0) return `0 ${labelMaund}`;

  const wholeMaunds = Math.floor(val);
  const remainderKg = Math.round((val - wholeMaunds) * 40);

  if (remainderKg === 0) {
    return `${wholeMaunds} ${labelMaund}`;
  }
  if (remainderKg === 40) {
    return `${wholeMaunds + 1} ${labelMaund}`;
  }

  return `${wholeMaunds} ${labelMaund} ${remainderKg} ${labelKg}`;
}
