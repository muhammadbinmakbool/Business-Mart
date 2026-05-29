import { PRINT_CONFIG } from "../theme/printConfig";
import { UNIT_IDS, DEFAULT_UNIT } from "@/lib/units";

/**
 * Format currency with default symbol and local number formatting.
 */
export function formatCurrency(amount, locale = "en") {
  const num = typeof amount === "string" ? parseFloat(amount.replace(/,/g, "")) : amount;
  if (isNaN(num)) return amount;
  
  const formattedNum = Number(num).toLocaleString(locale === "ur" ? "ur-PK" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  const symbol = PRINT_CONFIG.defaultCurrency;
  
  // Format based on locale: e.g. Rs. 1,234.56
  return `${symbol} ${formattedNum}`;
}

/**
 * Format weights based on the unit and locale (translating unit tags like MAUND or KG).
 */
export function formatWeight(weight, unit = DEFAULT_UNIT, locale = "en") {
  const num = typeof weight === "string" ? parseFloat(weight.replace(/,/g, "")) : weight;
  
  if ((unit === UNIT_IDS.MAUND || unit === "MND") && !isNaN(num)) {
    const wholeMaunds = Math.floor(num);
    const remainderKg = Math.round((num - wholeMaunds) * 40);
    
    if (remainderKg > 0 && remainderKg < 40) {
      if (locale === "ur") {
        return `${wholeMaunds} من ${remainderKg} کلو`;
      }
      return `${wholeMaunds} MND ${remainderKg} KG`;
    }
  }

  const formattedWeight = isNaN(num) ? weight : Number(num).toLocaleString(locale === "ur" ? "ur-PK" : "en-US");
  
  let translatedUnit = unit;
  if (locale === "ur") {
    if (unit === UNIT_IDS.MAUND || unit === "MND") translatedUnit = "من";
    else if (unit === UNIT_IDS.KG) translatedUnit = "کلو";
  } else {
    if (unit === UNIT_IDS.MAUND) translatedUnit = "MND";
  }
  
  return `${formattedWeight} ${translatedUnit}`;
}

/**
 * Format bag count with pluralization/labels.
 */
export function formatBags(bagCount, locale = "en") {
  if (!bagCount) return locale === "ur" ? "دستیاب نہیں" : "N/A";
  const num = typeof bagCount === "string" ? parseFloat(bagCount.replace(/,/g, "")) : bagCount;
  const formattedCount = isNaN(num) ? bagCount : Number(num).toLocaleString(locale === "ur" ? "ur-PK" : "en-US");
  
  if (locale === "ur") {
    return `${formattedCount} بوریاں`;
  }
  return `${formattedCount} Bags`;
}
