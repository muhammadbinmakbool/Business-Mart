import { prisma } from "@/lib/prisma";

export class PartyProfileService {
  /**
   * Simplified profile retrieval method.
   * Compiles simple invoice-based financial statistics, chronological event timelines,
   * and clean outstanding balances without complex ledger simulations.
   * 
   * @param {number|string} partyId - The unique ID of the target party
   */
  static async getPartyProfile(partyId) {
    const pId = parseInt(partyId);
    if (isNaN(pId)) throw new Error("Invalid Party ID provided");

    const party = await prisma.party.findUnique({
      where: { id: pId },
      include: {
        saleTransactions: {
          where: { isDeleted: false, status: { not: "CANCELLED" } },
          orderBy: { entryDate: "desc" }
        },
        intakeAdvances: {
          orderBy: { createdAt: "desc" }
        },
        supplierInvoices: {
          where: { status: { not: "SUPERSEDED" } },
          orderBy: { entryDate: "desc" }
        }
      }
    });

    if (!party) return null;

    // Buyer side: Sales obligations
    const sales = party.saleTransactions.map(s => {
      const finalAmount = Number(s.finalAmount || 0);
      const paidAmount = Number(s.paidAmount || 0);
      const remainingAmount = Math.max(0, finalAmount - paidAmount);
      return {
        id: s.id,
        saleNumber: s.saleNumber,
        entryDate: s.entryDate,
        totalWeight: Number(s.totalWeight || 0),
        finalAmount,
        allocatedAmount: paidAmount, // Map to allocatedAmount to preserve UI prop bindings!
        remainingAmount,
        status: s.paymentStatus, // Use paymentStatus for payment tags (PENDING, PARTIAL, CLEARED)
        notes: s.notes
      };
    });

    // Supplier side: Settlement obligations
    const settlements = party.supplierInvoices.map(inv => {
      const finalPayable = Number(inv.finalPayableAmount || 0);
      const paidAmount = Number(inv.paidAmount || 0);
      const remainingAmount = Math.max(0, finalPayable - paidAmount);
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        entryDate: inv.entryDate,
        totalGrossValue: Number(inv.totalGrossValue || 0),
        totalDeductions: Number(inv.totalDeductions || 0),
        totalAdvances: Number(inv.totalAdvances || 0),
        finalPayableAmount: finalPayable,
        allocatedAmount: paidAmount, // Map to allocatedAmount to preserve UI prop bindings!
        remainingAmount,
        status: inv.paymentStatus // Use paymentStatus for payment tags (PENDING, PARTIAL, CLEARED)
      };
    });

    const advances = party.intakeAdvances.map(a => ({
      id: a.id,
      amount: Number(a.amount || 0),
      notes: a.notes,
      createdAt: a.createdAt
    }));

    // Financial Sums
    const totalSales = sales.reduce((sum, s) => sum + s.finalAmount, 0);
    const totalSalesPaid = sales.reduce((sum, s) => sum + s.allocatedAmount, 0);
    const totalSalesRemaining = sales.reduce((sum, s) => sum + s.remainingAmount, 0);

    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);

    const totalSupplierPayable = settlements.reduce((sum, s) => sum + s.finalPayableAmount, 0);
    const totalSupplierPaid = settlements.reduce((sum, s) => sum + s.allocatedAmount, 0);
    const totalSupplierRemaining = settlements.reduce((sum, s) => sum + s.remainingAmount, 0);

    // net official balance: (Outstanding Sales Debt + Advances DR) - (Outstanding Supplier Payable)
    // If positive: Party owes us money (DR)
    // If negative: We owe party money (CR)
    const officialBalance = (totalSalesRemaining + totalAdvances) - totalSupplierRemaining;

    // Timeline Events: compiles chronological list of business transactions
    const timelineEvents = [];

    // Sales events
    sales.forEach(sale => {
      timelineEvents.push({
        id: `sale-${sale.id}`,
        date: new Date(sale.entryDate),
        type: "SALE",
        ref: sale.saleNumber,
        description: `Sale invoice processed`,
        debit: sale.finalAmount,
        credit: 0,
        requiredAmount: sale.finalAmount,
        allocatedAmount: sale.allocatedAmount,
        remainingAmount: sale.remainingAmount,
        clearingStatus: sale.status
      });
    });

    // Supplier Invoices
    settlements.forEach(inv => {
      timelineEvents.push({
        id: `sup-${inv.id}`,
        date: new Date(inv.entryDate),
        type: "SUPPLIER_INVOICE",
        ref: inv.invoiceNumber,
        description: `Supplier invoice generated`,
        debit: 0,
        credit: inv.finalPayableAmount,
        requiredAmount: inv.finalPayableAmount,
        allocatedAmount: inv.allocatedAmount,
        remainingAmount: inv.remainingAmount,
        clearingStatus: inv.status
      });
    });

    // Advances
    advances.forEach(adv => {
      timelineEvents.push({
        id: `adv-${adv.id}`,
        date: new Date(adv.createdAt),
        type: "CASH_OUT",
        ref: `ADV-${adv.id}`,
        description: adv.notes || `Cash advance payout recorded`,
        debit: adv.amount,
        credit: 0,
        requiredAmount: adv.amount,
        allocatedAmount: adv.amount,
        remainingAmount: 0,
        clearingStatus: "CLEARED"
      });
    });

    // Chronological order sorting
    timelineEvents.sort((a, b) => a.date - b.date);

    let runningTotal = 0;
    timelineEvents.forEach(evt => {
      runningTotal += evt.debit - evt.credit;
      evt.runningBalance = runningTotal;
    });

    // Descending for latest display first
    timelineEvents.sort((a, b) => b.date - a.date);

    return {
      party: {
        id: party.id,
        name: party.name,
        partyType: party.partyType,
        phoneNumber: party.phoneNumber,
        address: party.address,
        notes: party.notes,
        isActive: party.isActive,
        createdAt: party.createdAt
      },
      summary: {
        totalSales,
        totalSalesPaid,
        totalSalesRemaining,
        totalAdvances,
        totalSupplierPayable,
        totalSupplierPaid,
        totalSupplierRemaining,
        officialBalance,
        forecastBalance: officialBalance // Matches official balance under simplified model
      },
      timeline: timelineEvents,
      detailedViews: {
        sales,
        settlements,
        advances,
        payments: [] // Legacy payment list kept empty to preserve interface compliance without errors
      }
    };
  }
}
