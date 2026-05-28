import { SupplierInvoiceRepository } from "../repositories/SupplierInvoiceRepository";
import { calculateSupplierDeductions, calculateInvoiceClearingState } from "@/lib/financial";
import { prisma } from "@/lib/prisma";
import { convertRate } from "@/lib/units";
import { emitActivity } from "@/modules/activity-log/activityLogger";


export class SupplierInvoiceService {
  /**
   * Generates a new supplier invoice snapshot.
   */
  static async generateInvoice(partyId, intakeIds, advanceIds, adjustmentsByIntake = {}) {
    // 1. Fetch live data for event records
    const [intakes, advances] = await Promise.all([
      prisma.intakeTransaction.findMany({
        where: { id: { in: intakeIds.map(id => parseInt(id)) } },
        include: { product: true, salesTracks: true }
      }),
      prisma.intakeAdvance.findMany({
        where: { id: { in: advanceIds.map(id => parseInt(id)) } }
      })
    ]);

    if (intakes.length === 0) throw new Error("No intakes selected");

    // 2. Map adjustments to intakes and compute totals via centralized financial logic
    const intakesWithAdjustments = intakes.map(intake => ({
      ...intake,
      adjustments: adjustmentsByIntake[intake.id] || []
    }));

    const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(intakesWithAdjustments);
    const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
    const finalPayableAmount = netValue - totalAdvances;

    // 3. Prepare immutable snapshots for items with nested adjustments
    const itemsData = intakes.map(intake => {
      const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
      const actualRate = convertRate(intake.rate, intake.rateUnit || "KG", intake.unit || "KG", intake.product);
      const rate = actualRate ? Number(actualRate) : 0;
      
      const breakdown = intakeBreakdowns.find(b => b.intakeId === intake.id);
      const itemAdjustments = breakdown ? breakdown.adjustments : [];
      const grossAmount = breakdown ? breakdown.gross : (billingWeight * rate);
      const averageRate = billingWeight > 0 ? (grossAmount / billingWeight) : rate;

      return {
        intakeTransactionId: intake.id,
        weight: billingWeight,
        rate: averageRate,
        amount: grossAmount,
        adjustments: itemAdjustments
      };
    });

    // 4. Sequence number
    const invoiceNumber = await SupplierInvoiceRepository.getNextInvoiceNumber();

    // 5. Create derived document record
    const invoice = await SupplierInvoiceRepository.createWithItems(
      {
        invoiceNumber,
        partyId: parseInt(partyId),
        totalGrossValue,
        totalDeductions,
        totalAdvances,
        finalPayableAmount,
        status: "PENDING",
        version: 1,
        lastCalculatedAt: new Date()
      },
      itemsData,
      advanceIds
    );

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: invoice.id,
      action: "CREATED",
      description: `Supplier settlement ${invoice.invoiceNumber} generated`,
      meta: {
        supplierId: invoice.partyId,
        totalGrossValue: Number(invoice.totalGrossValue),
        finalPayableAmount: Number(invoice.finalPayableAmount)
      }
    });

    return JSON.parse(JSON.stringify(invoice));
  }

  /**
    * Regenerates a new version of an invoice, preserving the old one.
    */
   static async regenerateInvoice(oldInvoiceId, adjustmentsByIntake = null) {
     const oldInvoice = await SupplierInvoiceRepository.getById(oldInvoiceId);
     if (!oldInvoice) throw new Error("Invoice not found");
 
     // 1. Collect IDs from the old derived document to pull fresh data
     const intakeIds = oldInvoice.items.map(i => i.intakeTransactionId);
     const advanceIds = oldInvoice.advances.map(a => a.id);
 
     // 2. Fetch fresh event records
     const [intakes, advances] = await Promise.all([
       prisma.intakeTransaction.findMany({
         where: { id: { in: intakeIds } },
         include: { product: true, salesTracks: true }
       }),
       prisma.intakeAdvance.findMany({
         where: { id: { in: advanceIds } }
       })
     ]);
 
     // 3. Resolve adjustments to use (fall back to old invoice adjustments if none provided)
     let adjustmentsToUse = {};
     if (adjustmentsByIntake && Object.keys(adjustmentsByIntake).length > 0) {
       adjustmentsToUse = adjustmentsByIntake;
     } else {
       oldInvoice.items.forEach(item => {
         adjustmentsToUse[item.intakeTransactionId] = (item.adjustments || []).map(adj => ({
           adjustmentType: adj.adjustmentType,
           method: adj.method,
           value: Number(adj.value),
           direction: adj.direction
         }));
       });
     }
 
     // 4. Map adjustments and recalculate
     const intakesWithAdjustments = intakes.map(intake => ({
       ...intake,
       adjustments: adjustmentsToUse[intake.id] || []
     }));
 
     const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(intakesWithAdjustments);
     const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
     const finalPayableAmount = netValue - totalAdvances;
 
     // 5. Prepare item snapshots
      const itemsData = intakes.map(intake => {
        const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
        const actualRate = convertRate(intake.rate, intake.rateUnit || "KG", intake.unit || "KG", intake.product);
        const rate = actualRate ? Number(actualRate) : 0;
        
        const breakdown = intakeBreakdowns.find(b => b.intakeId === intake.id);
        const itemAdjustments = breakdown ? breakdown.adjustments : [];
        const grossAmount = breakdown ? breakdown.gross : (billingWeight * rate);
        const averageRate = billingWeight > 0 ? (grossAmount / billingWeight) : rate;

        return {
          intakeTransactionId: intake.id,
          weight: billingWeight,
          rate: averageRate,
          amount: grossAmount,
          adjustments: itemAdjustments
        };
      });
 
      // 6. Execute atomic transaction
      const newInvoice = await prisma.$transaction(async (tx) => {
        // Mark old invoice as SUPERSEDED and isOutdated
        await tx.supplierInvoice.update({
          where: { id: parseInt(oldInvoiceId) },
          data: { status: "SUPERSEDED", isOutdated: true }
        });
 
        // Create new version
        const newInvoice = await tx.supplierInvoice.create({
          data: {
            invoiceNumber: oldInvoice.invoiceNumber,
            partyId: oldInvoice.partyId,
            totalGrossValue,
            totalDeductions,
            totalAdvances,
            finalPayableAmount,
            status: "PENDING",
            version: oldInvoice.version + 1,
            lastCalculatedAt: new Date(),
            items: {
              create: itemsData.map(item => ({
                intakeTransactionId: item.intakeTransactionId,
                weight: item.weight,
                rate: item.rate,
                amount: item.amount,
                adjustments: {
                  create: item.adjustments.map(adj => ({
                    adjustmentType: adj.adjustmentType,
                    method: adj.method,
                    value: adj.value,
                    calculatedAmount: adj.calculatedAmount,
                    direction: adj.direction,
                    unit: adj.unit || null
                  }))
                }
              }))
            },
            advances: {
              connect: advanceIds.map(id => ({ id: parseInt(id) }))
            }
          },
          include: {
            items: {
              include: {
                intake: { include: { product: true } },
                adjustments: true
              }
            },
            advances: true,
            party: true
          }
        });
 
        return newInvoice;
      });

      await emitActivity({
        entityType: "SETTLEMENT",
        entityId: parseInt(oldInvoiceId),
        action: "SUPERSEDED",
        description: `Supplier invoice ID ${oldInvoiceId} superseded by version ${newInvoice.version} (${newInvoice.invoiceNumber})`,
        meta: { supersededById: newInvoice.id }
      });

      await emitActivity({
        entityType: "SETTLEMENT",
        entityId: newInvoice.id,
        action: "CREATED",
        description: `Supplier invoice ${newInvoice.invoiceNumber} generated via regeneration (v${newInvoice.version})`,
        meta: {
          supplierId: newInvoice.partyId,
          totalGrossValue: Number(newInvoice.totalGrossValue),
          finalPayableAmount: Number(newInvoice.finalPayableAmount)
        }
      });

      return JSON.parse(JSON.stringify(newInvoice));
   }

  /**
   * Edits an invoice by generating a new version with updated selections and adjustments.
   */
  static async editInvoice(oldInvoiceId, newIntakeIds, newAdvanceIds, newAdjustmentsByIntake) {
    const oldInvoice = await SupplierInvoiceRepository.getById(oldInvoiceId);
    if (!oldInvoice) throw new Error("Invoice not found");

    if (oldInvoice.status !== "PENDING") {
      throw new Error("Only PENDING invoices can be edited");
    }

    const newInvoice = await prisma.$transaction(async (tx) => {
      // 1. Mark old invoice as SUPERSEDED and isOutdated
      await tx.supplierInvoice.update({
        where: { id: parseInt(oldInvoiceId) },
        data: { status: "SUPERSEDED", isOutdated: true }
      });

      // 2. Fetch fresh event records
      const [intakes, advances] = await Promise.all([
        tx.intakeTransaction.findMany({
          where: { id: { in: newIntakeIds.map(id => parseInt(id)) } },
          include: { product: true, salesTracks: true }
        }),
        tx.intakeAdvance.findMany({
          where: { id: { in: newAdvanceIds.map(id => parseInt(id)) } }
        })
      ]);

      if (intakes.length === 0) throw new Error("No intakes selected");

      // 3. Map adjustments and recalculate
      const intakesWithAdjustments = intakes.map(intake => ({
        ...intake,
        adjustments: newAdjustmentsByIntake[intake.id] || []
      }));

      const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(intakesWithAdjustments);
      const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
      const finalPayableAmount = netValue - totalAdvances;

      // 4. Prepare item snapshots
      const itemsData = intakes.map(intake => {
        const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
        const actualRate = convertRate(intake.rate, intake.rateUnit || "KG", intake.unit || "KG", intake.product);
        const rate = actualRate ? Number(actualRate) : 0;
        
        const breakdown = intakeBreakdowns.find(b => b.intakeId === intake.id);
        const itemAdjustments = breakdown ? breakdown.adjustments : [];
        const grossAmount = breakdown ? breakdown.gross : (billingWeight * rate);
        const averageRate = billingWeight > 0 ? (grossAmount / billingWeight) : rate;

        return {
          intakeTransactionId: intake.id,
          weight: billingWeight,
          rate: averageRate,
          amount: grossAmount,
          adjustments: itemAdjustments
        };
      });

      // 5. Create NEW version with a new invoice number but incremented version
      const lastInvoice = await tx.supplierInvoice.findFirst({
        orderBy: { id: "desc" },
        select: { id: true }
      });
      const nextId = (lastInvoice?.id || 0) + 1;
      const invoiceNumber = `SUP-${nextId.toString().padStart(6, "0")}`;

      const newInvoice = await tx.supplierInvoice.create({
        data: {
          invoiceNumber,
          partyId: oldInvoice.partyId,
          totalGrossValue,
          totalDeductions,
          totalAdvances,
          finalPayableAmount,
          status: "PENDING",
          version: oldInvoice.version + 1,
          lastCalculatedAt: new Date(),
          items: {
            create: itemsData.map(item => ({
              weight: item.weight,
              rate: item.rate,
              amount: item.amount,
              intake: { connect: { id: parseInt(item.intakeTransactionId) } },
              adjustments: {
                create: (item.adjustments || []).map(adj => ({
                  adjustmentType: adj.adjustmentType,
                  method: adj.method,
                  value: adj.value,
                  calculatedAmount: adj.calculatedAmount,
                  direction: adj.direction,
                  unit: adj.unit || null
                }))
              }
            }))
          },
          advances: {
            connect: newAdvanceIds.map(id => ({ id: parseInt(id) }))
          }
        },
        include: {
          items: {
            include: {
              intake: { include: { product: true } },
              adjustments: true
            }
          },
          advances: true,
          party: true
        }
      });

      return newInvoice;
    });

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: parseInt(oldInvoiceId),
      action: "SUPERSEDED",
      description: `Supplier invoice ID ${oldInvoiceId} superseded by version ${newInvoice.version} (${newInvoice.invoiceNumber}) via edit`,
      meta: { supersededById: newInvoice.id }
    });

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: newInvoice.id,
      action: "CREATED",
      description: `Supplier invoice ${newInvoice.invoiceNumber} generated via edit (v${newInvoice.version})`,
      meta: {
        supplierId: newInvoice.partyId,
        totalGrossValue: Number(newInvoice.totalGrossValue),
        finalPayableAmount: Number(newInvoice.finalPayableAmount)
      }
    });

    return JSON.parse(JSON.stringify(newInvoice));
  }

  /**
   * Safely deletes an invoice if it is currently PENDING.
   */
  static async deleteInvoice(invoiceId) {
    const invoice = await SupplierInvoiceRepository.getById(invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    if (invoice.status !== "PENDING") {
      throw new Error("Only PENDING invoices can be deleted");
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Disconnect any advances linked to this invoice
      await tx.intakeAdvance.updateMany({
        where: { supplierInvoiceId: parseInt(invoiceId) },
        data: { supplierInvoiceId: null }
      });

      // 2. Delete the supplier invoice adjustments (cascaded by DB)
      // 3. Delete the supplier invoice items (cascaded by DB)
      // 4. Delete the supplier invoice itself
      await tx.supplierInvoice.delete({
        where: { id: parseInt(invoiceId) }
      });

      return { success: true };
    });

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: parseInt(invoiceId),
      action: "DELETED",
      description: `Supplier invoice ID ${invoiceId} (${invoice.invoiceNumber}) deleted`,
      meta: { supplierId: invoice.partyId, invoiceNumber: invoice.invoiceNumber }
    });

    return result;
  }

  static async recordPayment(id, amount) {
    const invoiceId = parseInt(id);
    const amt = Number(amount);
    if (isNaN(invoiceId)) throw new Error("Invalid Supplier Invoice ID");
    if (isNaN(amt) || amt <= 0) throw new Error("Payment amount must be greater than zero");

    const updated = await prisma.$transaction(async (tx) => {
      const invoice = await tx.supplierInvoice.findUnique({
        where: { id: invoiceId }
      });

      if (!invoice) throw new Error("Supplier invoice not found");
      if (invoice.status === "SUPERSEDED") throw new Error("Cannot record payment on a superseded invoice");
      if (invoice.status === "CANCELLED") throw new Error("Cannot record payment on a cancelled invoice");

      const total = Number(invoice.finalPayableAmount);
      const currentPaid = Number(invoice.paidAmount || 0);
      const remaining = Math.max(0, total - currentPaid);

      if (amt > remaining) {
        throw new Error(`Payment amount Rs. ${amt} exceeds the remaining balance of Rs. ${remaining}`);
      }

      const newPaid = currentPaid + amt;
      const clearingState = calculateInvoiceClearingState(total, newPaid);
      
      return tx.supplierInvoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaid,
          paymentStatus: clearingState.paymentStatus,
          status: clearingState.paymentStatus
        }
      });
    });

    await emitActivity({
      entityType: "SETTLEMENT",
      entityId: updated.id,
      action: updated.status === "CLEARED" ? "CLEARED" : "UPDATED",
      description: `Recorded partial payment of Rs. ${amt.toLocaleString()} on Supplier Invoice ${updated.invoiceNumber}. Total paid: Rs. ${Number(updated.paidAmount).toLocaleString()}`,
      meta: {
        supplierId: updated.partyId,
        paymentAmount: amt,
        paidAmount: Number(updated.paidAmount),
        paymentStatus: updated.paymentStatus
      }
    });

    return updated;
  }
}

