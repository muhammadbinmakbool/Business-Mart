import { PRINT_CONFIG } from "../theme/printConfig";
import { 
  formatCurrency as baseFormatCurrency, 
  formatWeight as baseFormatWeight, 
  formatBags as baseFormatBags 
} from "@/lib/financial/format";

/**
 * Format currency with default symbol and local number formatting.
 * Inherits system defaults from printConfig.
 */
export function formatCurrency(amount, locale = "en", currencySymbol = null, decimalPlaces = null) {
  const symbol = currencySymbol || PRINT_CONFIG.defaultCurrency || "Rs.";
  const precision = typeof decimalPlaces === "number" 
    ? decimalPlaces 
    : (PRINT_CONFIG.decimalPlaces !== undefined ? PRINT_CONFIG.decimalPlaces : 2);
  
  return baseFormatCurrency(amount, locale, symbol, precision);
}

/**
 * Format weights based on the unit and locale (translating unit tags like MAUND or KG).
 */
export function formatWeight(weight, unit, locale = "en") {
  return baseFormatWeight(weight, unit, locale);
}

/**
 * Format bag count with pluralization/labels.
 */
export function formatBags(bagCount, locale = "en") {
  return baseFormatBags(bagCount, locale);
}
