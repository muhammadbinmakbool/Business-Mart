/**
 * Centralized registry of standard Error Codes for Business Mart.
 * Maps exact codes to default title, message, and visual presentation parameters.
 */
export const ERROR_CODES = {
  INSUFFICIENT_STOCK: {
    code: "INSUFFICIENT_STOCK",
    title: "Insufficient Inventory Stock",
    message: "Cannot complete this action because physical inventory stock levels would become negative.",
    type: "error"
  },
  NEGATIVE_INPUT: {
    code: "NEGATIVE_INPUT",
    title: "Invalid Negative Parameters",
    message: "Weight, quantity, and rate parameters must be positive numbers greater than zero.",
    type: "error"
  },
  MISSING_CONVERSION: {
    code: "MISSING_CONVERSION",
    title: "Missing Unit Conversion Specs",
    message: "The selected product is missing active unit conversion multipliers for the chosen unit category.",
    type: "warning"
  },
  TRANSACTION_BILLED: {
    code: "TRANSACTION_BILLED",
    title: "Transaction Already Billed",
    message: "This operational transaction is locked because it is already included in a finalized sale or purchase invoice.",
    type: "error"
  },
  SETTLEMENT_LOCKED: {
    code: "SETTLEMENT_LOCKED",
    title: "Settlement Period Locked",
    message: "This operational transaction is locked because it has already been settled and accounted with the supplier.",
    type: "error"
  },
  VALIDATION_ERROR: {
    code: "VALIDATION_ERROR",
    title: "Input Validation Error",
    message: "Please correct the highlighted input fields and submit again.",
    type: "warning"
  },
  UNKNOWN_ERROR: {
    code: "UNKNOWN_ERROR",
    title: "Unexpected Error Occurred",
    message: "An unexpected system anomaly has occurred. Please contact the administrator.",
    type: "error"
  }
};
