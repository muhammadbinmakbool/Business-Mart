import { round } from "@/lib/financial";
import { UNIT_IDS, DEFAULT_WEIGHT_UNIT } from "@/lib/units";

/**
 * Formats a currency value using the core financial `round` logic and locale-specific grouping.
 * 
 * @param {number|string} amount - The currency amount to format
 * @param {string} locale - 'en' or 'ur'
 * @param {string} currencySymbol - e.g. 'Rs.', '$', 'AED'
 * @param {number} decimalPlaces - Precision
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, locale = "en", currencySymbol = "Rs.", decimalPlaces = 2) {
  const num = typeof amount === "string" ? parseFloat(amount.replace(/,/g, "")) : amount;
  if (num === null || num === undefined || isNaN(num)) return amount;
  
  const precision = decimalPlaces !== null && decimalPlaces !== undefined && !isNaN(Number(decimalPlaces)) 
    ? Number(decimalPlaces) 
    : 2;
  
  // Enforce the core rounding logic from financial.js
  const roundedAmount = round(num, precision);
  
  const formattedNum = Number(roundedAmount).toLocaleString(locale === "ur" ? "ur-PK" : "en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
  
  const symbol = currencySymbol || "Rs.";
  return `${symbol} ${formattedNum}`;
}

/**
 * Formats a number using the core financial `round` logic and locale-specific grouping.
 * 
 * @param {number|string} amount - The numeric value to format
 * @param {string} locale - 'en' or 'ur'
 * @param {number} decimalPlaces - Precision
 * @returns {string} Formatted number string
 */
export function formatNumber(amount, locale = "en", decimalPlaces = 2) {
  const num = typeof amount === "string" ? parseFloat(amount.replace(/,/g, "")) : amount;
  if (num === null || num === undefined || isNaN(num)) return amount;
  
  const precision = decimalPlaces !== null && decimalPlaces !== undefined && !isNaN(Number(decimalPlaces)) 
    ? Number(decimalPlaces) 
    : 2;
  
  const roundedAmount = round(num, precision);
  
  return Number(roundedAmount).toLocaleString(locale === "ur" ? "ur-PK" : "en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
}

/**
 * Formats weights with support for Maund (MND) and Kilograms (KG).
 * Handles Urdu translation (RTL) and fractional Maund parsing.
 * 
 * @param {number|string} weight - Weight amount
 * @param {string} unit - 'KG', 'MAUND', etc.
 * @param {string} locale - 'en' or 'ur'
 * @returns {string} Formatted weight string
 */
export function formatWeight(weight, unit = DEFAULT_WEIGHT_UNIT, locale = "en") {
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
 * Formats bag counts.
 * 
 * @param {number|string} bagCount - Number of bags
 * @param {string} locale - 'en' or 'ur'
 * @returns {string} Formatted bags string
 */
export function formatBags(bagCount, locale = "en") {
  if (bagCount === null || bagCount === undefined || bagCount === "") {
    return locale === "ur" ? "دستیاب نہیں" : "N/A";
  }
  const num = typeof bagCount === "string" ? parseFloat(bagCount.replace(/,/g, "")) : bagCount;
  const formattedCount = isNaN(num) ? bagCount : Number(num).toLocaleString(locale === "ur" ? "ur-PK" : "en-US");
  
  if (locale === "ur") {
    return `${formattedCount} بوریاں`;
  }
  return `${formattedCount} Bags`;
}
