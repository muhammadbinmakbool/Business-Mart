import { prisma } from "@/lib/prisma";

export class PartySettlementService {
  /**
   * Records a new payment event (CASH_IN or CASH_OUT) and executes chronological FIFO allocation.
   *
   * @param {object} params
   * @param {number} params.partyId - Target party ID
   * @param {string} params.paymentType - CASH_IN (buyer) or CASH_OUT (supplier)
   * @param {number} params.amount - Total payment amount
   * @param {string} [params.paymentMethod] - CASH, BANK, JAZZCASH, EASYPAISA, CHEQUE
   * @param {string} [params.notes] - Operational notes
   * @param {Date} [params.entryDate] - Date of payment event
   * @param {string} [params.directReferenceType] - Optional direct target invoice type
   * @param {number} [params.directReferenceId] - Optional direct target invoice ID
   */
  /**
   * Records a new payment event (CASH_IN or CASH_OUT) and executes chronological FIFO allocation.
   *
   * @param {object} params
   * @param {number} params.partyId - Target party ID
   * @param {string} params.paymentType - CASH_IN (buyer) or CASH_OUT (supplier)
   * @param {number} params.amount - Total payment amount
   * @param {string} [params.paymentMethod] - CASH, BANK, JAZZCASH, EASYPAISA, CHEQUE
   * @param {string} [params.notes] - Operational notes
   * @param {Date} [params.entryDate] - Date of payment event
   * @param {string} [params.sourceType] - Optional source mapping (MANUAL, DIRECT_SALE, DIRECT_SETTLEMENT, SYSTEM)
   * @param {number} [params.sourceId] - Optional source target record ID
   */
  static async recordPayment({
    partyId,
    paymentType,
    amount,
    paymentMethod = "CASH",
    notes = null,
    entryDate = new Date(),
    sourceType = "MANUAL",
    sourceId = null
  }) {
    const pId = parseInt(partyId);
    const amt = parseFloat(amount);

    if (isNaN(pId)) throw new Error("Invalid Party ID");
    if (isNaN(amt) || amt <= 0) throw new Error("Payment amount must be greater than zero");
    if (paymentType !== "CASH_IN" && paymentType !== "CASH_OUT") {
      throw new Error("Invalid payment type. Must be CASH_IN or CASH_OUT");
    }

    // Generate unique paymentNumber (e.g. PAY-IN-1001 or PAY-OUT-1001)
    const count = await prisma.partyPayment.count();
    const prefix = paymentType === "CASH_IN" ? "PAY-IN" : "PAY-OUT";
    let paymentNumber = `${prefix}-${1000 + count + 1}`;

    // Ensure uniqueness
    const exists = await prisma.partyPayment.findUnique({ where: { paymentNumber } });
    if (exists) {
      paymentNumber = `${paymentNumber}-${Math.floor(Math.random() * 900) + 100}`;
    }

    // Create the physical payment (historical truth)
    const payment = await prisma.partyPayment.create({
      data: {
        partyId: pId,
        paymentNumber,
        paymentType,
        paymentMethod,
        amount: amt,
        notes,
        entryDate: new Date(entryDate),
        sourceType,
        sourceId: sourceId ? parseInt(sourceId) : null,
        status: "ACTIVE"
      }
    });

    // Run dynamic re-allocation for this party & type
    await this.reallocateFIFO(pId, paymentType);

    return payment;
  }

  /**
   * dynamic chronological FIFO re-allocation.
   * Wipes allocations belonging ONLY to ACTIVE payments of this party & type, keeping VOIDED ones frozen.
   * NEVER modifies the physical payments (historical truth).
   *
   * @param {number} partyId - Target party ID
   * @param {string} type - CASH_IN or CASH_OUT
   */
  static async reallocateFIFO(partyId, type) {
    const pId = parseInt(partyId);
    if (isNaN(pId)) throw new Error("Invalid Party ID");

    // 1. Wipe existing allocations belonging ONLY to ACTIVE payments for this party & type
    // This freezes and locks the allocation history snapshot for VOIDED payments!
    await prisma.partyPaymentAllocation.deleteMany({
      where: {
        partyId: pId,
        payment: {
          paymentType: type,
          status: "ACTIVE"
        }
      }
    });

    // 2. Fetch all ACTIVE payments (historical truth) for this party & type to allocate
    const payments = await prisma.partyPayment.findMany({
      where: { partyId: pId, paymentType: type, status: "ACTIVE" },
      orderBy: { entryDate: "asc" }
    });

    // 3. Fetch active obligations (Sales for CASH_IN, Settlements for CASH_OUT)
    let obligations = [];
    if (type === "CASH_IN") {
      obligations = await prisma.saleTransaction.findMany({
        where: { partyId: pId, isDeleted: false, status: { not: "CANCELLED" } },
        orderBy: { entryDate: "asc" }
      });
    } else {
      obligations = await prisma.supplierInvoice.findMany({
        where: { partyId: pId, status: { not: "SUPERSEDED" } },
        orderBy: { entryDate: "asc" }
      });
    }

    // Keep track of total allocated amount per obligation (including existing allocations from VOIDED / REVERSED payments)
    const allocatedMap = new Map();
    for (const o of obligations) {
      // Find allocations from frozen VOIDED / REVERSED payments for this obligation
      const frozenAllocs = await prisma.partyPaymentAllocation.findMany({
        where: {
          referenceType: type === "CASH_IN" ? "SALE" : "SETTLEMENT",
          referenceId: o.id,
          payment: {
            status: { not: "ACTIVE" }
          }
        }
      });
      const frozenTotal = frozenAllocs.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
      allocatedMap.set(o.id, frozenTotal);
    }

    // ==========================================
    // PHASE A: Allocate Direct Clearance Payments
    // ==========================================
    for (const payment of payments) {
      if (payment.sourceType === "DIRECT_SALE" || payment.sourceType === "DIRECT_SETTLEMENT") {
        if (!payment.sourceId) continue;
        const refId = payment.sourceId;
        const refType = payment.sourceType === "DIRECT_SALE" ? "SALE" : "SETTLEMENT";

        // Verify obligation exists in our list
        const obligation = obligations.find(o => o.id === refId);
        if (obligation) {
          const reqAmount = refType === "SALE" 
            ? Number(obligation.finalAmount) 
            : Number(obligation.finalPayableAmount);
            
          const currentAlloc = allocatedMap.get(refId) || 0;
          const remainingRequired = reqAmount - currentAlloc;

          if (remainingRequired > 0) {
            // Allocate exact remaining or maximum possible from the payment
            const alloc = Math.min(Number(payment.amount), remainingRequired);
            
            await prisma.partyPaymentAllocation.create({
              data: {
                partyId: pId,
                paymentId: payment.id,
                referenceType: refType,
                referenceId: refId,
                allocatedAmount: alloc
              }
            });

            allocatedMap.set(refId, currentAlloc + alloc);
          }
        }
      }
    }

    // ==========================================
    // PHASE B: Allocate General Payments (FIFO)
    // ==========================================
    for (const payment of payments) {
      // Skip direct clearance payments in general FIFO allocations
      if (payment.sourceType === "DIRECT_SALE" || payment.sourceType === "DIRECT_SETTLEMENT") {
        continue;
      }

      let pRem = Number(payment.amount);

      for (const obligation of obligations) {
        if (pRem <= 0) break;

        const reqAmount = type === "CASH_IN" 
          ? Number(obligation.finalAmount) 
          : Number(obligation.finalPayableAmount);

        const currentAlloc = allocatedMap.get(obligation.id) || 0;
        const sReq = reqAmount - currentAlloc;

        if (sReq <= 0) continue; // Already fully cleared

        const alloc = Math.min(pRem, sReq);

        await prisma.partyPaymentAllocation.create({
          data: {
            partyId: pId,
            paymentId: payment.id,
            referenceType: type === "CASH_IN" ? "SALE" : "SETTLEMENT",
            referenceId: obligation.id,
            allocatedAmount: alloc
          }
        });

        allocatedMap.set(obligation.id, currentAlloc + alloc);
        pRem -= alloc;
      }
    }

    // ==========================================
    // PHASE C: Dynamic Document Status Updates
    // ==========================================
    for (const obligation of obligations) {
      const reqAmount = type === "CASH_IN" 
        ? Number(obligation.finalAmount) 
        : Number(obligation.finalPayableAmount);

      const allocated = allocatedMap.get(obligation.id) || 0;

      let nextStatus = "PENDING";
      if (allocated > 0) {
        if (allocated >= reqAmount) {
          nextStatus = "CLEARED";
        } else {
          nextStatus = "PARTIAL";
        }
      }

      if (type === "CASH_IN") {
        await prisma.saleTransaction.update({
          where: { id: obligation.id },
          data: { status: nextStatus }
        });
      } else {
        // Map "CLEARED" to "COMPLETED" for backward-compatibility with supplier settlements
        const dbStatus = nextStatus === "CLEARED" ? "COMPLETED" : nextStatus;
        await prisma.supplierInvoice.update({
          where: { id: obligation.id },
          data: { status: dbStatus }
        });
      }
    }
  }

  /**
   * Directly clears a single invoice (Sale or Settlement) by registering a matching direct clearance payment.
   *
   * @param {string} referenceType - SALE or SETTLEMENT
   * @param {number} referenceId - Target record ID
   * @param {string} [paymentMethod] - CASH, BANK, etc.
   * @param {string} [notes] - Optional clearing notes
   */
  static async clearInvoiceDirectly(referenceType, referenceId, paymentMethod = "CASH", notes = null) {
    const refId = parseInt(referenceId);
    if (isNaN(refId)) throw new Error("Invalid Reference ID");
    if (referenceType !== "SALE" && referenceType !== "SETTLEMENT") {
      throw new Error("Invalid reference type. Must be SALE or SETTLEMENT");
    }

    let partyId = 0;
    let requiredAmount = 0;
    let paymentType = "";

    if (referenceType === "SALE") {
      const sale = await prisma.saleTransaction.findUnique({
        where: { id: refId }
      });
      if (!sale) throw new Error("Sale transaction not found");
      partyId = sale.partyId;
      paymentType = "CASH_IN";
      
      const allocations = await prisma.partyPaymentAllocation.findMany({
        where: { referenceType: "SALE", referenceId: refId }
      });
      const currentAlloc = allocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
      requiredAmount = Number(sale.finalAmount) - currentAlloc;
    } else {
      const invoice = await prisma.supplierInvoice.findUnique({
        where: { id: refId }
      });
      if (!invoice) throw new Error("Supplier Invoice settlement not found");
      partyId = invoice.partyId;
      paymentType = "CASH_OUT";

      const allocations = await prisma.partyPaymentAllocation.findMany({
        where: { referenceType: "SETTLEMENT", referenceId: refId }
      });
      const currentAlloc = allocations.reduce((sum, a) => sum + Number(a.allocatedAmount), 0);
      requiredAmount = Number(invoice.finalPayableAmount) - currentAlloc;
    }

    if (requiredAmount <= 0) {
      throw new Error("Invoice is already fully settled");
    }

    const defaultNotes = notes || `Direct clearance of ${referenceType} invoice #${refId}`;

    // Record the direct targeted payment
    return await this.recordPayment({
      partyId,
      paymentType,
      amount: requiredAmount,
      paymentMethod,
      notes: defaultNotes,
      entryDate: new Date(),
      sourceType: referenceType === "SALE" ? "DIRECT_SALE" : "DIRECT_SETTLEMENT",
      sourceId: refId
    });
  }

  /**
   * Voids a payment record and automatically triggers dynamic FIFO reallocation.
   * NEVER physically deletes the payment record, ensuring a permanent audit trail.
   * Wipes allocations for ACTIVE payments, freezing this payment's snapshot.
   *
   * @param {number} paymentId - Payment ID
   */
  static async deletePayment(paymentId) {
    const pId = parseInt(paymentId);
    if (isNaN(pId)) throw new Error("Invalid Payment ID");

    const payment = await prisma.partyPayment.findUnique({ where: { id: pId } });
    if (!payment) throw new Error("Payment not found");

    // Mark status as VOIDED instead of physically deleting to preserve history!
    await prisma.partyPayment.update({
      where: { id: pId },
      data: { status: "VOIDED" }
    });

    // Trigger FIFO re-allocation to repair remaining active payments allocations
    await this.reallocateFIFO(payment.partyId, payment.paymentType);
  }
}
