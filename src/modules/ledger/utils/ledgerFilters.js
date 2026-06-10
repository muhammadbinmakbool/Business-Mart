import { filterByDateRange } from "@/lib/dateFilters";

/**
 * Shared ledger sessions filtering function.
 * Runs on both server-side export and client-side page views.
 * 
 * @param {Array} sessions - Array of ledger sessions
 * @param {Object} filters
 * @param {string} filters.searchQuery
 * @param {Object} filters.dateFilter
 * @returns {Array} Filtered list of sessions
 */
export function filterSessions(sessions, { searchQuery = "", dateFilter = null } = {}) {
  let result = sessions;

  // Apply date filter (using startDate)
  if (dateFilter) {
    result = filterByDateRange(result, "startDate", dateFilter);
  }

  // Apply search query filter
  if (searchQuery && searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    result = result.filter(session => 
      session.title?.toLowerCase().includes(q) || 
      session.notes?.toLowerCase().includes(q)
    );
  }

  return result;
}
