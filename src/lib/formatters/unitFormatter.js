import { decomposeQuantity } from "../units";

/**
 * Maps a mathematically decomposed unit object to a localized display string.
 * E.g., { value: 40, unit: "MAUND", secondaryValue: 20, secondaryUnit: "KG" }
 * -> "40 MND 20 KG" (English) or "40 من 20 کلو" (Urdu).
 */
export function formatDecomposedQuantity(decomposed, locale = "en") {
  if (!decomposed) return "";
  
  const isUrdu = locale === "ur";
  
  const translations = {
    ur: {
      MAUND: "من",
      MND: "من",
      KG: "کلو",
      G: "گرام",
      TON: "ٹن",
      LITER: "لیٹر",
      LTR: "لیٹر",
      ML: "ملی لیٹر",
      PIECE: "عدد",
      PCS: "عدد",
      BOX: "باکس",
      PACK: "پیک",
      PCK: "پیک",
      BAG: "بوری"
    },
    en: {
      MAUND: "MND",
      MND: "MND",
      KG: "KG",
      G: "G",
      TON: "TON",
      LITER: "LTR",
      LTR: "LTR",
      ML: "ML",
      PIECE: "PCS",
      PCS: "PCS",
      BOX: "BOX",
      PACK: "PCK",
      PCK: "PCK",
      BAG: "BAG"
    }
  };

  const getLabel = (unit) => {
    if (!unit) return "";
    const normalized = unit.toUpperCase();
    const dictionary = translations[isUrdu ? "ur" : "en"];
    return dictionary[normalized] || unit;
  };

  const val1 = decomposed.value;
  const unit1 = decomposed.unit;
  const val2 = decomposed.secondaryValue;
  const unit2 = decomposed.secondaryUnit;

  const formattedVal1 = val1.toLocaleString(isUrdu ? "ur-PK" : "en-US");
  const label1 = getLabel(unit1);

  if (val2 !== undefined && val2 !== null && val2 !== 0 && unit2) {
    const formattedVal2 = val2.toLocaleString(isUrdu ? "ur-PK" : "en-US");
    const label2 = getLabel(unit2);
    
    return `${formattedVal1} ${label1} ${formattedVal2} ${label2}`;
  }

  return `${formattedVal1} ${label1}`;
}

/**
 * High-level wrapper that decomposes a raw quantity and returns the localized display string.
 */
export function formatUnitDisplay(quantity, unitId, product = null, locale = "en", unitRegistry = null) {
  const decomposed = decomposeQuantity(quantity, unitId, product, unitRegistry);
  return formatDecomposedQuantity(decomposed, locale);
}
