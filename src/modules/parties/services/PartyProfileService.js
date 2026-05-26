import { prisma } from "@/lib/prisma";
import { convertRate } from "@/lib/units";

export class PartyProfileService {
  /**
   * Unified profile intelligence retrieval method.
   * Compiles the dynamic financial overview, detailed transaction tables,
   * check-and-balance reconciliation data, and chronological timeline.
   * 
   * @param {number|string} partyId - The unique ID of the target party
   */
  static async getPartyProfile(partyId) {
    const pId = parseInt(partyId);
    if (isNaN(pId)) throw new Error("Invalid Party ID provided");

    // ==========================================
    // 1. DATA FETCH LAYER (Atomic and optimized)
    // ==========================================
    const party = await prisma.party.findUnique({
      where: { id: pId },
      include: {
        payments: {
          orderBy: { entryDate: "desc" },
          include: { allocations: true }
        },
        allocations: {
          orderBy: { createdAt: "desc" }
        },
        saleTransactions: {
          where: { isDeleted: false, status: { not: "CANCELLED" } },
          include: {
            adjustments: true,
            items: { include: { product: true } }
          },
          orderBy: { entryDate: "desc" }
        },
        intakeTransactions: {
          where: { status: { not: "CANCELLED" } },
          include: {
            product: true,
            invoiceItems: {
              include: {
                invoice: true
              }
            }
          },
          orderBy: { entryDate: "desc" }
        },
        intakeAdvances: {
          orderBy: { createdAt: "desc" }
        },
        supplierInvoices: {
          where: { status: { not: "SUPERSEDED" } },
          include: {
            items: {
              include: {
                adjustments: true,
                intake: { include: { product: true } }
              }
            },
            advances: true
          },
          orderBy: { entryDate: "desc" }
        }
      }
    });

    if (!party) return null;

    // ==========================================
    // 2. FINANCIAL AGGREGATION LAYER (Financial Truth)
    // ==========================================
    // Fetch Cash receipts and payouts
    const totalCashIn = party.payments
      .filter(p => p.paymentType === "CASH_IN")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalCashOut = party.payments
      .filter(p => p.paymentType === "CASH_OUT")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Sales (Debit obligations)
    const totalSales = party.saleTransactions.reduce(
      (sum, sale) => sum + Number(sale.finalAmount || 0),
      0
    );

    // Intake Advances (Debit obligations)
    const totalAdvances = party.intakeAdvances.reduce(
      (sum, adv) => sum + Number(adv.amount || 0),
      0
    );

    const totalDebits = totalSales + totalAdvances + totalCashOut;

    // CREDITS calculation (Billed/Realized vs Pending/Estimated)
    const realizedCredit = party.supplierInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalGrossValue || 0) - Number(inv.totalDeductions || 0),
      0
    );

    // Unbilled Intakes (Pending Credit)
    let pendingCredit = 0;
    const unbilledIntakesList = [];
    const billedIntakesList = [];

    party.intakeTransactions.forEach(intake => {
      // Check if this intake has any active billing item
      const activeBillingItem = intake.invoiceItems?.find(
        ii => ii.invoice && ii.invoice.status !== "SUPERSEDED"
      );

      const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined
        ? Number(intake.netWeight)
        : Number(intake.grossWeight);

      const rate = intake.rate ? Number(intake.rate) : 0;
      const actualRate = convertRate(rate, intake.rateUnit || "KG", intake.unit || "KG", intake.product);
      const estimatedValue = billingWeight * Number(actualRate || 0);

      if (activeBillingItem) {
        // Record as billed intake
        billedIntakesList.push({
          id: intake.id,
          intakeNumber: intake.intakeNumber,
          entryDate: intake.entryDate,
          product: intake.product?.name || "Unknown Product",
          weight: Number(activeBillingItem.weight),
          rate: Number(activeBillingItem.rate),
          finalValue: Number(activeBillingItem.amount),
          invoiceNumber: activeBillingItem.invoice.invoiceNumber,
          status: "BILLED"
        });
      } else {
        // Record as unbilled intake (pending credit)
        pendingCredit += estimatedValue;
        unbilledIntakesList.push({
          id: intake.id,
          intakeNumber: intake.intakeNumber,
          entryDate: intake.entryDate,
          product: intake.product?.name || "Unknown Product",
          weight: billingWeight,
          rate: Number(actualRate || 0),
          estimatedValue: estimatedValue,
          status: "PENDING"
        });
      }
    });

    const totalCredits = realizedCredit + pendingCredit;

    // Derived Balances & Reconciliation Limits
    // Net buyer balance = Sales - CashIn
    // Net supplier balance = (Advances + CashOut) - RealizedCredit
    // Net overall balance combining BOTH roles
    const officialBalance = (totalSales + totalAdvances + totalCashOut) - (totalCashIn + realizedCredit);
    const forecastBalance = (totalSales + totalAdvances + totalCashOut) - (totalCashIn + realizedCredit + pendingCredit);

    // ==========================================
    // 3. TIMELINE BUILDER LAYER (Storytelling Log)
    // ==========================================
    const timelineEvents = [];

    // Sales events enriched with allocation metadata
    party.saleTransactions.forEach(sale => {
      const allocs = party.allocations.filter(a => a.referenceType === "SALE" && a.referenceId === sale.id);
      const allocatedAmount = allocs.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
      const remainingAmount = Number(sale.finalAmount) - allocatedAmount;

      timelineEvents.push({
        id: `sale-${sale.id}`,
        date: new Date(sale.entryDate),
        type: "SALE",
        ref: sale.saleNumber,
        description: `Sale billing invoice processed`,
        debit: Number(sale.finalAmount),
        credit: 0,
        status: sale.status,
        requiredAmount: Number(sale.finalAmount),
        allocatedAmount,
        remainingAmount,
        clearingStatus: sale.status
      });
    });

    // Advance Payouts
    party.intakeAdvances.forEach(adv => {
      timelineEvents.push({
        id: `adv-${adv.id}`,
        date: new Date(adv.createdAt),
        type: "CASH_OUT",
        ref: `ADV-${adv.id}`,
        description: adv.notes || `Cash advance payout recorded`,
        debit: Number(adv.amount),
        credit: 0,
        status: "COMPLETED",
        requiredAmount: Number(adv.amount),
        allocatedAmount: Number(adv.amount),
        remainingAmount: 0,
        clearingStatus: "CLEARED"
      });
    });

    // Cash Payouts and Cash Receipts directly from PartyPayment
    party.payments.forEach(pay => {
      const isCashIn = pay.paymentType === "CASH_IN";
      timelineEvents.push({
        id: `pay-${pay.id}`,
        date: new Date(pay.entryDate),
        type: pay.paymentType,
        ref: pay.paymentNumber,
        description: pay.notes || `${isCashIn ? "Cash payment received" : "Cash payment paid out"} [${pay.paymentMethod}]`,
        debit: isCashIn ? 0 : Number(pay.amount),
        credit: isCashIn ? Number(pay.amount) : 0,
        status: "COMPLETED",
        requiredAmount: Number(pay.amount),
        allocatedAmount: Number(pay.amount),
        remainingAmount: 0,
        clearingStatus: "CLEARED"
      });
    });

    // Intake Credit Events
    party.intakeTransactions.forEach(intake => {
      const activeBillingItem = intake.invoiceItems?.find(
        ii => ii.invoice && ii.invoice.status !== "SUPERSEDED"
      );

      let creditAmount = 0;
      let isBilled = false;
      let description = "";

      if (activeBillingItem) {
        creditAmount = Number(activeBillingItem.amount);
        isBilled = true;
        description = `Goods intake (Billed via ${activeBillingItem.invoice.invoiceNumber})`;
      } else {
        const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined
          ? Number(intake.netWeight)
          : Number(intake.grossWeight);
        const rate = intake.rate ? Number(intake.rate) : 0;
        const actualRate = convertRate(rate, intake.rateUnit || "KG", intake.unit || "KG", intake.product);
        creditAmount = billingWeight * Number(actualRate || 0);
        description = `Goods intake (Estimated, Pending Settlement)`;
      }

      timelineEvents.push({
        id: `intake-${intake.id}`,
        date: new Date(intake.entryDate),
        type: "INTAKE",
        ref: intake.intakeNumber,
        description,
        debit: 0,
        credit: creditAmount,
        status: isBilled ? "COMPLETED" : "PENDING",
        requiredAmount: creditAmount,
        allocatedAmount: isBilled ? creditAmount : 0,
        remainingAmount: isBilled ? 0 : creditAmount,
        clearingStatus: isBilled ? "CLEARED" : "PENDING"
      });
    });

    // Sort ascending to compute chronological running balance
    timelineEvents.sort((a, b) => a.date - b.date);

    let runningTotal = 0;
    timelineEvents.forEach(evt => {
      runningTotal += evt.debit - evt.credit;
      evt.runningBalance = runningTotal;
    });

    // Sort descending for direct timeline visual feed
    timelineEvents.sort((a, b) => b.date - a.date);

    // ==========================================
    // 4. RETURN DESERIALIZED DATA FOR VIEW LAYER
    // ==========================================
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
        totalAdvances,
        totalPaidInvoices: totalCashOut, // Align paid invoices to physical CashOut payments
        totalDebits,
        realizedCredit,
        pendingCredit,
        totalCredits,
        officialBalance,
        forecastBalance
      },
      timeline: timelineEvents,
      detailedViews: {
        sales: party.saleTransactions.map(s => {
          const allocs = party.allocations.filter(a => a.referenceType === "SALE" && a.referenceId === s.id);
          const allocated = allocs.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
          return {
            id: s.id,
            saleNumber: s.saleNumber,
            entryDate: s.entryDate,
            totalWeight: Number(s.totalWeight),
            finalAmount: Number(s.finalAmount),
            allocatedAmount: allocated,
            remainingAmount: Number(s.finalAmount) - allocated,
            status: s.status,
            notes: s.notes
          };
        }),
        intakes: {
          billed: billedIntakesList,
          unbilled: unbilledIntakesList
        },
        settlements: party.supplierInvoices.map(inv => {
          const allocs = party.allocations.filter(a => a.referenceType === "SETTLEMENT" && a.referenceId === inv.id);
          const allocated = allocs.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
          return {
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            entryDate: inv.entryDate,
            totalGrossValue: Number(inv.totalGrossValue),
            totalDeductions: Number(inv.totalDeductions),
            totalAdvances: Number(inv.totalAdvances),
            finalPayableAmount: Number(inv.finalPayableAmount),
            allocatedAmount: allocated,
            remainingAmount: Number(inv.finalPayableAmount) - allocated,
            status: inv.status
          };
        }),
        advances: party.intakeAdvances.map(a => ({
          id: a.id,
          amount: Number(a.amount),
          notes: a.notes,
          createdAt: a.createdAt
        })),
        payments: party.payments.map(p => ({
          id: p.id,
          paymentNumber: p.paymentNumber,
          paymentType: p.paymentType,
          paymentMethod: p.paymentMethod,
          amount: Number(p.amount),
          entryDate: p.entryDate,
          notes: p.notes,
          directReferenceType: p.directReferenceType,
          directReferenceId: p.directReferenceId,
          allocations: p.allocations.map(a => ({
            id: a.id,
            referenceType: a.referenceType,
            referenceId: a.referenceId,
            allocatedAmount: Number(a.allocatedAmount)
          }))
        }))
      }
    };
  }
}
