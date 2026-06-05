import { prisma } from "@/lib/prisma";
import { calculateInvoiceClearingState } from "@/lib/financial";
import { logPaymentEvent, logSaleEvent, logSettlementEvent } from "@/modules/activity-log/activityLogger";

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
          include: { supplierInvoice: true },
          orderBy: { createdAt: "desc" }
        },
        supplierInvoices: {
          where: { status: { not: "SUPERSEDED" } },
          orderBy: { entryDate: "desc" }
        },
        payments: {
          include: { allocations: true },
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
        createdAt: s.createdAt,
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
        createdAt: inv.createdAt,
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
      createdAt: a.createdAt,
      supplierInvoiceId: a.supplierInvoiceId,
      invoiceNumber: a.supplierInvoice?.invoiceNumber || null,
      intakeTransactionId: a.intakeTransactionId
    }));

    // Financial Sums
    const totalSales = sales.reduce((sum, s) => sum + s.finalAmount, 0);
    const totalSalesPaid = sales.reduce((sum, s) => sum + s.allocatedAmount, 0);
    const totalSalesRemaining = sales.reduce((sum, s) => sum + s.remainingAmount, 0);

    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
    const unadjustedAdvances = advances
      .filter(a => a.supplierInvoiceId === null)
      .reduce((sum, a) => sum + a.amount, 0);

    const totalSupplierPayable = settlements.reduce((sum, s) => sum + s.finalPayableAmount, 0);
    const totalSupplierPaid = settlements.reduce((sum, s) => sum + s.allocatedAmount, 0);
    const totalSupplierRemaining = settlements.reduce((sum, s) => sum + s.remainingAmount, 0);

    // net official balance: (Outstanding Sales Debt + Unadjusted Advances DR) - (Outstanding Supplier Payable)
    // If positive: Party owes us money (DR)
    // If negative: We owe party money (CR)
    const officialBalance = (totalSalesRemaining + unadjustedAdvances) - totalSupplierRemaining;

    // Fetch related activity logs to show status changes and direct payments in timeline
    let logs = [];
    try {
      logs = await prisma.activityLog.findMany({
        where: {
          entityType: "PARTY",
          entityId: pId
        },
        orderBy: { createdAt: "asc" }
      });
    } catch (e) {
      console.error("Failed to fetch activity logs for party timeline:", e);
    }

    // Timeline Events: compiles chronological list of business transactions
    const timelineEvents = [];

    // Sales events
    sales.forEach(sale => {
      timelineEvents.push({
        id: `sale-${sale.id}`,
        targetId: sale.id,
        date: new Date(sale.entryDate),
        createdAt: new Date(sale.createdAt),
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
        targetId: inv.id,
        date: new Date(inv.entryDate),
        createdAt: new Date(inv.createdAt),
        type: "SUPPLIER_INVOICE",
        ref: inv.invoiceNumber,
        description: `Supplier invoice generated`,
        debit: 0,
        credit: inv.finalPayableAmount + inv.totalAdvances,
        requiredAmount: inv.finalPayableAmount,
        allocatedAmount: inv.allocatedAmount,
        remainingAmount: inv.remainingAmount,
        clearingStatus: inv.status
      });
    });

    const payments = party.payments.map(p => {
      const totalAllocated = p.allocations.reduce((sum, a) => sum + Number(a.allocatedAmount || 0), 0);
      const unallocated = Number(p.amount || 0) - totalAllocated;
      return {
        id: p.id,
        paymentNumber: p.paymentNumber,
        paymentType: p.paymentType,
        paymentMethod: p.paymentMethod,
        amount: Number(p.amount || 0),
        entryDate: p.entryDate,
        notes: p.notes,
        status: p.status,
        allocatedAmount: totalAllocated,
        unallocatedAmount: unallocated,
        allocations: p.allocations.map(a => ({
          id: a.id,
          referenceType: a.referenceType,
          referenceId: a.referenceId,
          allocatedAmount: Number(a.allocatedAmount || 0),
          createdAt: a.createdAt
        }))
      };
    });

    // Advances
    advances.forEach(adv => {
      timelineEvents.push({
        id: `adv-${adv.id}`,
        targetId: adv.id,
        intakeTransactionId: adv.intakeTransactionId,
        date: new Date(adv.createdAt),
        createdAt: new Date(adv.createdAt),
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

    // Database Payment events
    payments.forEach(p => {
      const isCashIn = p.paymentType === "CASH_IN";
      timelineEvents.push({
        id: `db-pay-${p.id}`,
        targetId: p.id,
        date: new Date(p.entryDate),
        createdAt: new Date(p.createdAt),
        type: isCashIn ? "CASH_IN" : "CASH_OUT",
        ref: p.paymentNumber,
        description: p.notes || `${isCashIn ? "Cash received" : "Cash paid"}`,
        debit: isCashIn ? 0 : p.amount,
        credit: isCashIn ? p.amount : 0,
        requiredAmount: p.amount,
        allocatedAmount: p.allocatedAmount,
        remainingAmount: p.unallocatedAmount,
        clearingStatus: "CLEARED"
      });
    });

    const dbPaymentNumbers = new Set(payments.map(p => p.paymentNumber));

    // Log events (status toggles and direct payments)
    logs.forEach(log => {
      const logDate = new Date(log.createdAt);
      let logMeta = null;
      try {
        if (log.meta) {
          logMeta = typeof log.meta === "string" ? JSON.parse(log.meta) : log.meta;
        }
      } catch (e) {}

      const isStatusChange = log.description?.toLowerCase().includes("status") || log.description?.toLowerCase().includes("active");

      if (isStatusChange) {
        timelineEvents.push({
          id: `log-status-${log.id}`,
          targetId: log.id,
          date: logDate,
          createdAt: logDate,
          type: "STATUS_CHANGE",
          ref: `LOG-${log.id}`,
          description: log.description || "Party status updated",
          debit: 0,
          credit: 0,
          requiredAmount: 0,
          allocatedAmount: 0,
          remainingAmount: 0,
          clearingStatus: "CLEARED"
        });
      } else if (logMeta && logMeta.paymentAmount) {
        // Skip if this payment is already represented by a database PartyPayment record
        if (logMeta.paymentNumber && dbPaymentNumbers.has(logMeta.paymentNumber)) {
          return;
        }

        const amount = Number(logMeta.paymentAmount);
        const isCashIn = log.description?.toLowerCase().includes("cash in") || logMeta.paymentType === "CASH_IN";

        timelineEvents.push({
          id: `log-pay-${log.id}`,
          targetId: log.id,
          date: logDate,
          createdAt: logDate,
          type: isCashIn ? "CASH_IN" : "CASH_OUT",
          ref: `PAY-${log.id}`,
          description: log.description || (isCashIn ? "Cash received" : "Cash paid"),
          debit: isCashIn ? 0 : amount,
          credit: isCashIn ? amount : 0,
          requiredAmount: amount,
          allocatedAmount: Number(logMeta.allocatedAmount || 0),
          remainingAmount: Number(logMeta.unallocatedAmount || 0),
          clearingStatus: "CLEARED"
        });
      }
    });

    const getKarachiDateString = (date) => {
      const d = new Date(date);
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Karachi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      return formatter.format(d);
    };

    // Chronological order sorting (primary: entry Date day portion in Asia/Karachi, secondary: database creation time)
    timelineEvents.sort((a, b) => {
      const aDayStr = getKarachiDateString(a.date);
      const bDayStr = getKarachiDateString(b.date);

      const dateDiff = aDayStr.localeCompare(bDayStr);
      if (dateDiff !== 0) return dateDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    let runningTotal = 0;
    timelineEvents.forEach(evt => {
      runningTotal += evt.debit - evt.credit;
      evt.runningBalance = runningTotal;
    });

    // Descending for latest display first (primary: entry Date day portion in Asia/Karachi desc, secondary: database creation time desc)
    timelineEvents.sort((a, b) => {
      const aDayStr = getKarachiDateString(a.date);
      const bDayStr = getKarachiDateString(b.date);

      const dateDiff = bDayStr.localeCompare(aDayStr);
      if (dateDiff !== 0) return dateDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

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
        forecastBalance: officialBalance
      },
      timeline: timelineEvents,
      detailedViews: {
        sales,
        settlements,
        advances,
        payments
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

    // Fetch session details for database write and logging context
    let performedByUserId = 0;
    let performedByName = "system";
    try {
      const { getSession } = await import("@/lib/session");
      const session = await getSession();
      if (session) {
        performedByUserId = session.userId || 0;
        performedByName = session.userName || "system";
      }
    } catch (e) {
      // Cookies/session not available in this context
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create PartyPayment record first
      const paymentNumber = "PAY-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000);
      const payment = await tx.partyPayment.create({
        data: {
          partyId: pId,
          paymentNumber,
          paymentType: type,
          paymentMethod: "CASH",
          amount: amount,
          sourceType: "MANUAL",
          status: "ACTIVE",
          entryDate: new Date(),
          userId: performedByUserId,
          businessId: 0
        }
      });

      const summary = {
        paymentId: payment.id,
        paymentNumber: payment.paymentNumber,
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

          // Write allocation mapping record
          await tx.partyPaymentAllocation.create({
            data: {
              partyId: pId,
              paymentId: payment.id,
              referenceType: "SALE",
              referenceId: sale.id,
              allocatedAmount: allocated,
              userId: performedByUserId,
              businessId: 0
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

          // Write allocation mapping record
          await tx.partyPaymentAllocation.create({
            data: {
              partyId: pId,
              paymentId: payment.id,
              referenceType: "SETTLEMENT",
              referenceId: inv.id,
              allocatedAmount: allocated,
              userId: performedByUserId,
              businessId: 0
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

    // Find party details for logging
    const party = await prisma.party.findUnique({
      where: { id: pId }
    });
    const partyName = party ? party.name : `Party #${pId}`;

    const totalApplied = Number(amount);
    const unallocated = Number(result.unallocatedAmount);
    const allocated = totalApplied - unallocated;

    // Log the overall payment completed event
    const eventType = type === "CASH_IN" ? "DIRECT_CASH_IN" : "DIRECT_CASH_OUT";
    const paymentDirLabel = type === "CASH_IN" ? "Cash In" : "Cash Out";
    const description = `${performedByName} recorded ${paymentDirLabel} of Rs. ${totalApplied.toLocaleString()} for ${partyName}. Allocated Rs. ${allocated.toLocaleString()}. Unallocated Rs. ${unallocated.toLocaleString()}.`;

    await logPaymentEvent({
      partyId: pId,
      partyName,
      paymentType: type,
      eventType,
      amount: totalApplied,
      description,
      performedByUserId,
      performedByName,
      meta: {
        paymentNumber: result.paymentNumber,
        paymentAmount: totalApplied,
        allocatedAmount: allocated,
        unallocatedAmount: unallocated
      }
    });

    // Emit activity logs for individual allocations
    for (const alloc of result.allocations) {
      const isCleared = alloc.paymentStatus === "CLEARED";
      const action = isCleared ? "CLEARED" : "UPDATED";
      const label = type === "CASH_IN" ? `Sale ${alloc.invoiceNumber}` : `Supplier Invoice ${alloc.invoiceNumber}`;
      
      const allocDescription = `Recorded partial clearing payment of Rs. ${alloc.allocated.toLocaleString()} on ${label} (FIFO sequence). Total paid: Rs. ${alloc.newPaid.toLocaleString()}`;

      if (type === "CASH_IN") {
        await logSaleEvent({
          saleId: alloc.invoiceId,
          saleNumber: alloc.invoiceNumber,
          partyId: pId,
          partyName,
          action,
          description: allocDescription,
          amount: alloc.allocated,
          performedByUserId,
          performedByName,
          meta: {
            paymentStatus: alloc.paymentStatus,
            newPaid: alloc.newPaid
          }
        });
      } else {
        await logSettlementEvent({
          settlementId: alloc.invoiceId,
          invoiceNumber: alloc.invoiceNumber,
          partyId: pId,
          partyName,
          action,
          description: allocDescription,
          amount: alloc.allocated,
          performedByUserId,
          performedByName,
          meta: {
            paymentStatus: alloc.paymentStatus,
            newPaid: alloc.newPaid
          }
        });
      }
    }

    return result;
  }
}

