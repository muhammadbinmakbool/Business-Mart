// Reusable Adjustment Visibility Helper
import { ADJUSTMENT_TYPES_BUYER, ADJUSTMENT_TYPES_SUPPLIER } from "@/lib/constants";

/**
 * Normalizes an adjustment name to the standard uppercase settings key.
 * e.g., "Transport-Rent" -> "TRANSPORT_RENT"
 * e.g., "Market Fee" -> "MARKET_FEE"
 */
export function getAdjustmentKey(type) {
  if (!type) return "";
  return type.toUpperCase().replace(/[-\s]/g, "_");
}

/**
 * Checks if a specific adjustment type should be shown.
 * @param {string} type - The adjustment type name
 * @param {object} settings - The settings object containing adjustmentVisibility map
 * @returns {boolean}
 */
export function shouldShowAdjustment(type, settings) {
  if (!type) return false;
  const key = getAdjustmentKey(type);
  const visibility = settings?.adjustmentVisibility || {};
  
  // If the key is not explicitly set to false, it defaults to true (enabled)
  return visibility[key] !== false;
}

/**
 * Filters a list of adjustment types to only return those that are enabled.
 * @param {string[]} list - Array of adjustment type names
 * @param {object} settings - The settings object
 * @returns {string[]}
 */
export function getVisibleAdjustments(list, settings) {
  if (!Array.isArray(list)) return [];
  return list.filter(type => shouldShowAdjustment(type, settings));
}
