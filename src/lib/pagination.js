export const PAGE_SIZE_OPTIONS = [50, 100, 200];
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/**
 * Clamps a page size to the maximum allowed limit to prevent performance degradation.
 * @param {number|string} requestedLimit - The limit requested by the client
 * @returns {number} The clamped limit value
 */
export function clampLimit(requestedLimit) {
  const limit = parseInt(requestedLimit) || DEFAULT_PAGE_SIZE;
  return Math.min(limit, MAX_PAGE_SIZE);
}
