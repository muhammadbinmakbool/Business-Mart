/**
 * Data shaping and mapping helper for Party payment allocations.
 * Performs absolutely NO arithmetic or financial calculations.
 */
export class AllocationIndexer {
  /**
   * Groups active allocations by reference ID for O(1) page lookups.
   * @param {Array} payments - Pre-fetched payment records containing allocations
   * @param {string} referenceType - 'SALE' or 'SETTLEMENT'
   * @returns {Record<number, Array>} - Map of referenceId -> allocation records array
   */
  static indexAllocationsByInvoice(payments, referenceType) {
    const map = {};
    payments
      .filter(p => p.status === "ACTIVE")
      .forEach(p => {
        (p.allocations || []).forEach(a => {
          if (a.referenceType === referenceType) {
            const refId = Number(a.referenceId);
            if (!map[refId]) {
              map[refId] = [];
            }
            map[refId].push(a);
          }
        });
      });
    return map;
  }
}
