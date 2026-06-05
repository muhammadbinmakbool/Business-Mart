export class AllocationSummaryHelper {
  /**
   * Summarizes allocations for a single invoice or settlement from the database.
   * @param {object} tx - Prisma transaction or client instance
   * @param {string} referenceType - 'SALE' or 'SETTLEMENT'
   * @param {number} referenceId - The ID of the target transaction
   * @returns {Promise<number>} - Total allocated amount
   */
  static async getPaidAmountForInvoice(tx, referenceType, referenceId) {
    const allocations = await tx.partyPaymentAllocation.findMany({
      where: {
        referenceType,
        referenceId: parseInt(referenceId),
        payment: {
          status: "ACTIVE"
        }
      }
    });
    return allocations.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
  }

  /**
   * Groups allocations from pre-fetched payments by invoice ID for O(1) lookups.
   * @param {Array} payments - Pre-fetched payment records with allocations
   * @param {string} referenceType - 'SALE' or 'SETTLEMENT'
   * @returns {Record<number, number>} - Map of referenceId -> totalAllocatedAmount
   */
  static groupAllocationsByInvoice(payments, referenceType) {
    const map = {};
    payments
      .filter(p => p.status === "ACTIVE")
      .forEach(p => {
        (p.allocations || []).forEach(a => {
          if (a.referenceType === referenceType) {
            const refId = Number(a.referenceId);
            map[refId] = (map[refId] || 0) + Number(a.allocatedAmount || 0);
          }
        });
      });
    return map;
  }
}
