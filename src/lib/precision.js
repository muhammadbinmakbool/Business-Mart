/**
 * Precision Layer
 * Handles final-boundary rounding at output stages (0 decimal places / integer only).
 * 
 * WARNING:
 * This layer is used ONLY at UI presentation boundaries, settlement sheets, and reports.
 * PURE calculation engines (like financial.js) MUST NOT use rounding to prevent precision drift.
 */
export const Precision = {
  final: (value) => {
    if (value === null || value === undefined || isNaN(value)) return 0;
    return Math.round(Number(value));
  }
};
