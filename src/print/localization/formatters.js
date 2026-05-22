import { PRINT_CONFIG } from "../theme/printConfig";

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
export function formatWeight(weight, unit = "KG", locale = "en") {
  const num = typeof weight === "string" ? parseFloat(weight.replace(/,/g, "")) : weight;
  const formattedWeight = isNaN(num) ? weight : Number(num).toLocaleString(locale === "ur" ? "ur-PK" : "en-US");
  
  let translatedUnit = unit;
  if (locale === "ur") {
    if (unit === "MAUND" || unit === "MND") translatedUnit = "من";
    else if (unit === "KG") translatedUnit = "کلو";
  } else {
    if (unit === "MAUND") translatedUnit = "MND";
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
