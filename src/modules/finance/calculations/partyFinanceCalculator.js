/**
 * Pure mathematical calculator for Party financial positions.
 * Contains NO database or framework dependencies.
 */
export class PartyFinanceCalculator {
  /**
   * Calculates the summary statistics and net position for a party.
   * @param {object} params
   * @param {Array} params.sales - Active sales transactions
   * @param {Array} params.purchases - Active supplier invoices (settlements)
   * @param {Array} params.payments - Active payments (PartyPayment records)
   * @param {Array} params.advances - Supplier advances (IntakeAdvance records)
   * @returns {object} Financial position summary
   */
  static calculatePosition({ sales = [], purchases = [], payments = [], advances = [] }) {
    // 1. Summarize Buyer Sales
    const totalSales = sales.reduce((sum, s) => sum + Number(s.finalAmount || 0), 0);

    // 2. Summarize Supplier Purchases
    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.finalPayableAmount || 0), 0);

    // 3. Summarize Raw Payments In/Out
    const activePayments = payments.filter(p => p.status === "ACTIVE");
    const totalPaymentsIn = activePayments
      .filter(p => p.paymentType === "CASH_IN")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalPaymentsOut = activePayments
      .filter(p => p.paymentType === "CASH_OUT")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 4. Summarize Allocations
    let allocatedToSales = 0;
    let allocatedToPurchases = 0;

    activePayments.forEach(p => {
      (p.allocations || []).forEach(a => {
        const amt = Number(a.allocatedAmount || 0);
        if (a.referenceType === "SALE") {
          allocatedToSales += amt;
        } else if (a.referenceType === "SETTLEMENT") {
          allocatedToPurchases += amt;
        }
      });
    });

    // 5. Summarize Advances
    const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const unadjustedAdvances = advances
      .filter(a => a.supplierInvoiceId === null)
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    // 6. Unallocated Amounts
    const unallocatedCredit = Math.max(0, totalPaymentsIn - allocatedToSales);
    const unallocatedDebit = Math.max(0, totalPaymentsOut - allocatedToPurchases);

    // 7. Net Financial Position (Debit/Receivable is positive, Credit/Payable is negative)
    // Formula matches the chronological timeline running total:
    // netPosition = (totalSales - totalPaymentsIn) + unadjustedAdvances - (totalPurchases - totalPaymentsOut)
    const netPosition = (totalSales - totalPaymentsIn) + unadjustedAdvances - (totalPurchases - totalPaymentsOut);

    return {
      totalSales,
      totalPurchases,
      totalPaymentsIn,
      totalPaymentsOut,
      allocatedToSales,
      allocatedToPurchases,
      unallocatedCredit,
      unallocatedDebit,
      totalAdvances,
      unadjustedAdvances,
      netPosition
    };
  }
}
