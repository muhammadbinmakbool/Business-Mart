/**
 * Pure mathematical calculator for Party financial positions and clearing states.
 * Contains NO database or framework dependencies.
 */
export class PartyFinanceCalculator {
  /**
   * Calculates the clearing state of a single invoice from its allocations.
   * @param {number|Decimal} totalAmount - Invoice total amount
   * @param {Array} allocations - List of allocation records for this invoice
   * @returns {{
   *   paid: number,
   *   remaining: number,
   *   paymentStatus: string,
   *   isCleared: boolean
   * }}
   */
  static calculateInvoiceClearing(totalAmount, allocations = []) {
    const total = Number(totalAmount || 0);
    const paid = allocations.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
    const remaining = Math.max(0, total - paid);

    let paymentStatus = "PENDING";
    let isCleared = false;

    if (paid >= total) {
      paymentStatus = "CLEARED";
      isCleared = true;
    } else if (paid > 0) {
      paymentStatus = "PARTIAL";
    }

    return {
      paid,
      remaining,
      paymentStatus,
      isCleared
    };
  }

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
    // 1. Summarize obligations
    const totalSales = sales.reduce((sum, s) => sum + Number(s.finalAmount || 0), 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.finalPayableAmount || 0), 0);
    const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
    const unadjustedAdvances = advances
      .filter(a => a.supplierInvoiceId === null)
      .reduce((sum, a) => sum + Number(a.amount || 0), 0);

    // 2. Summarize raw payments
    const activePayments = payments.filter(p => p.status === "ACTIVE");
    const totalPaymentsIn = activePayments
      .filter(p => p.paymentType === "CASH_IN")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalPaymentsOut = activePayments
      .filter(p => p.paymentType === "CASH_OUT")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 3. Summarize allocations
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

    // 4. Summarize unallocated amounts
    const unallocatedCredit = Math.max(0, totalPaymentsIn - allocatedToSales);
    const unallocatedDebit = Math.max(0, totalPaymentsOut - allocatedToPurchases);

    // 5. Net Financial Position (Debit/Receivable is positive, Credit/Payable is negative)
    // Structured in 3 distinct buckets:
    // Bucket A: Obligations (Sales [DR] + Unadjusted Advances [DR] - Purchases [CR])
    const totalObligations = totalSales + unadjustedAdvances - totalPurchases;

    // Bucket B: Cash Movement (PaymentsOut [DR] - PaymentsIn [CR])
    const netCashMovement = totalPaymentsOut - totalPaymentsIn;

    // Bucket C: Net Position
    const netPosition = totalObligations + netCashMovement;

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
