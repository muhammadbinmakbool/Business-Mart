import { convertFromBase, convertRate, getUnitLabel } from "./units";

/**
 * Formats weight value for invoice-entry input defaults.
 * Purely presentation wrapper.
 */
export function formatWeightForInputUI(value, product) {
  const targetUnit = product?.primaryUnit || "KG";
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
  const targetUnit = product?.sellingRateUnit || "KG";
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
