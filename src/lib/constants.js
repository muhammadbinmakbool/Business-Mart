export const PARTY_TYPES = {
  SUPPLIER: "SUPPLIER",
  BUYER: "BUYER",
  BOTH: "BOTH",
};

export const INTAKE_STATUS = {
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
  SOLD: "SOLD",
  CLEARED: "CLEARED",
  CANCELLED: "CANCELLED",
};

export const UNIT_CATEGORIES = {
  WEIGHT: "WEIGHT",
  LIQUID: "LIQUID",
  QUANTITY: "QUANTITY",
};

export const ADJUSTMENT_TYPES_BUYER = [
  "Commission",
  "Labour",
  "Ghesai",
  "Market Fee",
  "Sootli"
];

export const ADJUSTMENT_TYPES_SUPPLIER = [
  "Labour",
  "Brokerage",
  "Aarhat",
  "Sootli",
  "Bardana",
  "Transport-Rent",
  "Loading"
];

export const INVOICE_STATUS = {
  PENDING: "PENDING",
  CLEARED: "CLEARED", // Renamed from COMPLETED for better domain vocabulary
  CANCELLED: "CANCELLED",
  SUPERSEDED: "SUPERSEDED",
};

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PARTIAL: "PARTIAL",
  CLEARED: "CLEARED",
};

// Auth & Ownership Constants
// SYSTEM_BUSINESS_ID: Centralized default business identifier.
// All create/update flows MUST inject this value via services.
// When multi-business support is introduced, this constant will be replaced
// by the authenticated user's business context.
export const SYSTEM_BUSINESS_ID = 0;

export const USER_ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
};
