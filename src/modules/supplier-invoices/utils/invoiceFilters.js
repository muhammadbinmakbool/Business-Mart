import { filterByDateRange } from "@/lib/dateFilters";

/**
 * Shared supplier invoices filtering function.
 * Runs on both server-side export and client-side page views.
 * 
 * @param {Array} invoices - Array of invoice records
 * @param {Object} filters
 * @param {string} filters.searchQuery
 * @param {string} filters.status
 * @param {Object} filters.dateFilter
 * @returns {Array} Filtered list of invoices
 */
export function filterInvoices(invoices, { searchQuery = "", status = "ALL", dateFilter = null } = {}) {
  let result = invoices;

  // Apply date filter
  if (dateFilter) {
    result = filterByDateRange(result, "entryDate", dateFilter);
  }

  // Apply status and search filters
  return result.filter((invoice) => {
    if (status === "ALL") {
      if (invoice.status === "SUPERSEDED") return false;
    } else if (invoice.status !== status) {
      return false;
    }

    if (!searchQuery || searchQuery.trim() === "") return true;
    const query = searchQuery.toLowerCase();
    const matchNumber = invoice.invoiceNumber?.toLowerCase().includes(query);
    const matchSupplier = invoice.party?.name?.toLowerCase().includes(query);
    return matchNumber || matchSupplier;
  });
}
