/**
 * Calculates the intake transaction state based on gross and remaining weights.
 *
 * @param {Object} params
 * @param {number|string} params.grossWeight
 * @param {number|string} params.remainingWeight
 * @returns {Object} { status: 'PENDING'|'PARTIAL'|'SOLD', soldWeight: number, soldPercentage: number, remainingWeight: number }
 */
export function calculateIntakeState({ grossWeight, remainingWeight }) {
  const gross = Number(grossWeight || 0);
  const remaining = Math.max(0, Number(remainingWeight !== null && remainingWeight !== undefined ? remainingWeight : gross));
  const sold = Math.max(0, gross - remaining);
  const percentage = gross > 0 ? (sold / gross) * 100 : 0;

  let status = "PENDING";
  if (remaining <= 0) {
    status = "SOLD";
  } else if (remaining < gross) {
    status = "PARTIAL";
  }

  return {
    status,
    soldWeight: sold,
    soldPercentage: Number(percentage.toFixed(2)),
    remainingWeight: remaining
  };
}
