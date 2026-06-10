import { filterByDateRange } from "@/lib/dateFilters";

/**
 * Shared sales filtering function.
 * Runs on both server-side export and client-side page views.
 * 
 * @param {Array} sales - Array of sale records
 * @param {Object} filters
 * @param {string} filters.searchQuery
 * @param {string} filters.status
 * @param {Object} filters.dateFilter
 * @returns {Array} Filtered list of sales
 */
export function filterSales(sales, { searchQuery = "", status = "ALL", dateFilter = null } = {}) {
  let result = sales;

  // Apply date filter
  if (dateFilter) {
    result = filterByDateRange(result, "entryDate", dateFilter);
  }

  // Apply status filter
  if (status && status !== "ALL") {
    result = result.filter(sale => sale.status === status);
  }

  // Apply search query
  if (searchQuery && searchQuery.trim() !== "") {
    const q = searchQuery.toLowerCase();
    result = result.filter(sale => {
      const saleNoMatch = sale.saleNumber?.toLowerCase().includes(q);
      const buyerMatch = sale.party?.name?.toLowerCase().includes(q);
      const productMatch = sale.items?.some(item => 
        item.product?.name?.toLowerCase().includes(q)
      );
      return saleNoMatch || buyerMatch || productMatch;
    });
  }

  return result;
}
