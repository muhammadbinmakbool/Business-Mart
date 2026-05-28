import { prisma } from "@/lib/prisma";

export class PartyInvoiceClearingService {
  /**
   * Applies a simple quick payment using chronological FIFO allocation to clear outstanding invoices.
   * Does NOT record to separate payment/allocation tables, keeping database model simple and robust.
   * 
   * @param {number|string} partyId - Target party ID
   * @param {number} amount - Quick payment amount entered by shopkeeper
   * @param {"CASH_IN"|"CASH_OUT"} type - Payment direction (CASH_IN for buyer invoices, CASH_OUT for supplier invoices)
   */
  static async applyPayment(partyId, amount, type) {
    const pId = parseInt(partyId);
    let remainingPayment = Number(amount);

    if (isNaN(pId)) throw new Error("Invalid Party ID");
    if (isNaN(remainingPayment) || remainingPayment <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }
    if (type !== "CASH_IN" && type !== "CASH_OUT") {
      throw new Error("Invalid payment type direction");
    }

    return prisma.$transaction(async (tx) => {
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

          const newPaymentStatus = newPaid >= total ? "CLEARED" : "PARTIAL";

          await tx.saleTransaction.update({
            where: { id: sale.id },
            data: {
              paidAmount: newPaid,
              paymentStatus: newPaymentStatus
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

          const newPaymentStatus = newPaid >= total ? "CLEARED" : "PARTIAL";

          await tx.supplierInvoice.update({
            where: { id: inv.id },
            data: {
              paidAmount: newPaid,
              paymentStatus: newPaymentStatus
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
  }
}
