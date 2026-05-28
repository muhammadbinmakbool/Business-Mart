import { prisma } from "@/lib/prisma";
import { calculateInvoiceClearingState } from "@/lib/financial";
import { emitActivity } from "@/modules/activity-log/activityLogger";

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
      const clearing = calculateInvoiceClearingState(s.finalAmount, s.paidAmount);
      return {
        id: s.id,
        saleNumber: s.saleNumber,
        entryDate: s.entryDate,
        totalWeight: Number(s.totalWeight || 0),
        finalAmount: clearing.total,
        allocatedAmount: clearing.paid,
        remainingAmount: clearing.remaining,
        status: clearing.paymentStatus,
        notes: s.notes
      };
    });

    // Supplier side: Settlement obligations
    const settlements = party.supplierInvoices.map(inv => {
      const clearing = calculateInvoiceClearingState(inv.finalPayableAmount, inv.paidAmount);
      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        entryDate: inv.entryDate,
        totalGrossValue: Number(inv.totalGrossValue || 0),
        totalDeductions: Number(inv.totalDeductions || 0),
        totalAdvances: Number(inv.totalAdvances || 0),
        finalPayableAmount: clearing.total,
        allocatedAmount: clearing.paid,
        remainingAmount: clearing.remaining,
        status: clearing.paymentStatus
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

  static async applyQuickPayment(partyId, amount, type) {
    const pId = parseInt(partyId);
    let remainingPayment = Number(amount);

    if (isNaN(pId)) throw new Error("Invalid Party ID");
    if (isNaN(remainingPayment) || remainingPayment <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }
    if (type !== "CASH_IN" && type !== "CASH_OUT") {
      throw new Error("Invalid payment type direction");
    }

    const result = await prisma.$transaction(async (tx) => {
      const summary = {
        totalApplied: amount,
        type,
        allocations: []
      };

      if (type === "CASH_IN") {
        // Buyer side: Clear SaleTransactions (Sales)
        const unpaidSales = await tx.saleTransaction.findMany({
          where: {
            partyId: pId,
            isDeleted: false,
            status: { not: "CANCELLED" },
            paymentStatus: { in: ["PENDING", "PARTIAL"] }
          },
          orderBy: [
            { entryDate: "asc" },
            { id: "asc" }
          ]
        });

        for (const sale of unpaidSales) {
          if (remainingPayment <= 0) break;

          const total = Number(sale.finalAmount);
          const currentPaid = Number(sale.paidAmount || 0);
          const needed = Math.max(0, total - currentPaid);

          if (needed <= 0) continue;

          const allocated = Math.min(remainingPayment, needed);
          const newPaid = currentPaid + allocated;
          remainingPayment -= allocated;

          const clearingState = calculateInvoiceClearingState(total, newPaid);
          const newPaymentStatus = clearingState.paymentStatus;

          await tx.saleTransaction.update({
            where: { id: sale.id },
            data: {
              paidAmount: newPaid,
              paymentStatus: newPaymentStatus,
              status: newPaymentStatus
            }
          });

          summary.allocations.push({
            invoiceId: sale.id,
            invoiceNumber: sale.saleNumber,
            total,
            previousPaid: currentPaid,
            allocated,
            newPaid,
            paymentStatus: newPaymentStatus
          });
        }
      } else {
        // Supplier side: Clear SupplierInvoices (Settlements)
        const unpaidInvoices = await tx.supplierInvoice.findMany({
          where: {
            partyId: pId,
            status: { not: "SUPERSEDED" },
            paymentStatus: { in: ["PENDING", "PARTIAL"] }
          },
          orderBy: [
            { entryDate: "asc" },
            { id: "asc" }
          ]
        });

        for (const inv of unpaidInvoices) {
          if (remainingPayment <= 0) break;

          const total = Number(inv.finalPayableAmount);
          const currentPaid = Number(inv.paidAmount || 0);
          const needed = Math.max(0, total - currentPaid);

          if (needed <= 0) continue;

          const allocated = Math.min(remainingPayment, needed);
          const newPaid = currentPaid + allocated;
          remainingPayment -= allocated;

          const clearingState = calculateInvoiceClearingState(total, newPaid);
          const newPaymentStatus = clearingState.paymentStatus;

          await tx.supplierInvoice.update({
            where: { id: inv.id },
            data: {
              paidAmount: newPaid,
              paymentStatus: newPaymentStatus,
              status: newPaymentStatus
            }
          });

          summary.allocations.push({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            total,
            previousPaid: currentPaid,
            allocated,
            newPaid,
            paymentStatus: newPaymentStatus
          });
        }
      }

      summary.unallocatedAmount = remainingPayment;
      return summary;
    });

    // Emit activity logs outside transaction for background fire-and-forget logging
    for (const alloc of result.allocations) {
      const isCleared = alloc.paymentStatus === "CLEARED";
      const action = isCleared ? "CLEARED" : "UPDATED";
      const entityType = type === "CASH_IN" ? "SALE" : "SETTLEMENT";
      const label = type === "CASH_IN" ? `Sale ${alloc.invoiceNumber}` : `Supplier Invoice ${alloc.invoiceNumber}`;
      const description = `Recorded partial clearing payment of Rs. ${alloc.allocated.toLocaleString()} on ${label} (FIFO sequence). Total paid: Rs. ${alloc.newPaid.toLocaleString()}`;

      await emitActivity({
        entityType,
        entityId: alloc.invoiceId,
        action,
        description,
        meta: {
          partyId: pId,
          paymentAmount: alloc.allocated,
          paidAmount: alloc.newPaid,
          paymentStatus: alloc.paymentStatus
        }
      });
    }

    return result;
  }
}

