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
    // DEBITS calculation (Claims & Cash Paid out)
    const totalSales = party.saleTransactions.reduce(
      (sum, sale) => sum + Number(sale.finalAmount || 0),
      0
    );

    const totalAdvances = party.intakeAdvances.reduce(
      (sum, adv) => sum + Number(adv.amount || 0),
      0
    );

    const totalPaidInvoices = party.supplierInvoices.reduce(
      (sum, inv) => inv.status === "COMPLETED" ? sum + Number(inv.finalPayableAmount || 0) : sum,
      0
    );

    const totalDebits = totalSales + totalAdvances + totalPaidInvoices;

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
    const officialBalance = totalDebits - realizedCredit; // Financial truth (realized only)
    const forecastBalance = totalDebits - totalCredits;   // Dynamic UI overlay containing pending credit

    // ==========================================
    // 3. TIMELINE BUILDER LAYER (Storytelling Log)
    // ==========================================
    const timelineEvents = [];

    // Sales events
    party.saleTransactions.forEach(sale => {
      timelineEvents.push({
        id: `sale-${sale.id}`,
        date: new Date(sale.entryDate),
        type: "SALE",
        ref: sale.saleNumber,
        description: `Sale billing invoice processed`,
        debit: Number(sale.finalAmount),
        credit: 0,
        status: sale.status
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
        status: "COMPLETED"
      });
    });

    // Completed Settlement Payouts
    party.supplierInvoices.forEach(inv => {
      if (inv.status === "COMPLETED") {
        timelineEvents.push({
          id: `pay-${inv.id}`,
          date: new Date(inv.updatedAt),
          type: "CASH_OUT",
          ref: `PAY-${inv.invoiceNumber}`,
          description: `Settlement final payment paid out`,
          debit: Number(inv.finalPayableAmount),
          credit: 0,
          status: "COMPLETED"
        });
      }
    });

    // Intake Credit Events
    // Note: Billed portions are mapped to their invoice-item finalized amounts; unbilled use estimations.
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
        status: isBilled ? "COMPLETED" : "PENDING"
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
        totalPaidInvoices,
        totalDebits,
        realizedCredit,
        pendingCredit,
        totalCredits,
        officialBalance,
        forecastBalance
      },
      timeline: timelineEvents,
      detailedViews: {
        sales: party.saleTransactions.map(s => ({
          id: s.id,
          saleNumber: s.saleNumber,
          entryDate: s.entryDate,
          totalWeight: Number(s.totalWeight),
          finalAmount: Number(s.finalAmount),
          status: s.status,
          notes: s.notes
        })),
        intakes: {
          billed: billedIntakesList,
          unbilled: unbilledIntakesList
        },
        settlements: party.supplierInvoices.map(inv => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          entryDate: inv.entryDate,
          totalGrossValue: Number(inv.totalGrossValue),
          totalDeductions: Number(inv.totalDeductions),
          totalAdvances: Number(inv.totalAdvances),
          finalPayableAmount: Number(inv.finalPayableAmount),
          status: inv.status
        })),
        advances: party.intakeAdvances.map(a => ({
          id: a.id,
          amount: Number(a.amount),
          notes: a.notes,
          createdAt: a.createdAt
        }))
      }
    };
  }
}
