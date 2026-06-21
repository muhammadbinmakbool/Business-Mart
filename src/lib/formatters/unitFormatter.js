import { decomposeQuantity, UNIT_ABBREVIATIONS, UNITS } from "../units";

/**
 * Returns the formatted label for a unit ID based on requested format (short vs long).
 */
export function getUnitLabelFormatted(unitId, format = "short", locale = "en", unitRegistry = null) {
  const source = unitRegistry || UNITS;
  const unitObj = source[unitId];
  const fullName = unitObj ? unitObj.name : unitId;
  const shortName = UNIT_ABBREVIATIONS[unitId] || unitId;

  // Supports future expansion to Urdu if locale is "ur"
  return format === "long" ? fullName : shortName;
}

/**
 * Maps a mathematically decomposed parts array to a display string.
 * E.g., [{ value: 40, unit: "MAUND" }, { value: 20, unit: "KG" }]
 * -> "40 MND 20 KG" (short) or "40 Maund 20 Kilogram" (long).
 */
export function formatDecomposedQuantity(parts, locale = "en", labelFormat = "short", unitRegistry = null) {
  if (!parts || parts.length === 0) return "";
  
  const isUrdu = locale === "ur";
  
  return parts.map(part => {
    const formattedVal = part.value.toLocaleString(isUrdu ? "ur-PK" : "en-US");
    const label = getUnitLabelFormatted(part.unit, labelFormat, locale, unitRegistry);
    return `${formattedVal} ${label}`;
  }).join(" ");
}

/**
 * High-level wrapper that decomposes a raw quantity and returns the formatted display string
 * based on system settings.
 */
export function formatUnitDisplay(quantity, unitId, product = null, locale = "en", unitRegistry = null, settings = {}) {
  if (quantity == null || isNaN(quantity)) {
    return "";
  }

  const precision = settings.unitDisplayPrecision !== undefined ? Number(settings.unitDisplayPrecision) : 2;
  const labelFormat = settings.unitLabelFormat || "short";

  if (precision <= 0) {
    // Decimal Display (No Decomposition)
    const isUrdu = locale === "ur";
    const label = getUnitLabelFormatted(unitId, labelFormat, locale, unitRegistry);
    const decimalPlaces = settings.decimalPlaces !== undefined ? Number(settings.decimalPlaces) : 2;
    const formattedQty = Number(quantity).toLocaleString(isUrdu ? "ur-PK" : "en-US", {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });
    return `${formattedQty} ${label}`;
  }

  const parts = decomposeQuantity(quantity, unitId, product, unitRegistry, precision);
  return formatDecomposedQuantity(parts, locale, labelFormat, unitRegistry);
}
