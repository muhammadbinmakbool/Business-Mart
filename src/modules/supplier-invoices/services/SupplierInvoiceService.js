import { SupplierInvoiceRepository } from "../repositories/SupplierInvoiceRepository";
import { calculateSupplierDeductions } from "@/lib/financial";
import { prisma } from "@/lib/prisma";

export class SupplierInvoiceService {
  /**
   * Generates a new supplier invoice snapshot.
   */
  static async generateInvoice(partyId, intakeIds, advanceIds, adjustments = []) {
    // 1. Fetch live data for event records
    const [intakes, advances] = await Promise.all([
      prisma.intakeTransaction.findMany({
        where: { id: { in: intakeIds.map(id => parseInt(id)) } },
        include: { product: true }
      }),
      prisma.intakeAdvance.findMany({
        where: { id: { in: advanceIds.map(id => parseInt(id)) } }
      })
    ]);

    if (intakes.length === 0) throw new Error("No intakes selected");

    // 2. Compute totals via centralized financial logic
    const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(intakes, adjustments);
    const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
    const finalPayableAmount = netValue - totalAdvances;

    // 3. Prepare immutable snapshots for items
    const itemsData = intakes.map(intake => {
      const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
      const rate = intake.rate !== null && intake.rate !== undefined ? Number(intake.rate) : 0;
      return {
        intakeTransactionId: intake.id,
        weight: billingWeight,
        rate: rate,
        amount: billingWeight * rate
      };
    });

    // 4. Aggregate calculatedAmount per adjustment
    const processedAdjustments = adjustments.map(adj => {
      let totalAmt = 0;
      intakeBreakdowns.forEach(breakdown => {
        const match = breakdown.adjustments.find(
          a => a.adjustmentType === adj.adjustmentType && 
               a.method === adj.method && 
               Number(a.value) === Number(adj.value)
        );
        if (match) {
          totalAmt += match.calculatedAmount;
        }
      });
      return {
        ...adj,
        calculatedAmount: totalAmt
      };
    });

    // 5. Sequence number
    const invoiceNumber = await SupplierInvoiceRepository.getNextInvoiceNumber();

    // 6. Create derived document record
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
      advanceIds,
      processedAdjustments
    );

    return JSON.parse(JSON.stringify(invoice));
  }

  /**
   * Regenerates a new version of an invoice, preserving the old one.
   */
  static async regenerateInvoice(oldInvoiceId, adjustments = null) {
    const oldInvoice = await SupplierInvoiceRepository.getById(oldInvoiceId);
    if (!oldInvoice) throw new Error("Invoice not found");

    // 1. Mark old invoice as SUPERSEDED and isOutdated
    await SupplierInvoiceRepository.updateStatus(oldInvoiceId, "SUPERSEDED", true);

    // 2. Collect IDs from the old derived document to pull fresh data
    const intakeIds = oldInvoice.items.map(i => i.intakeTransactionId);
    const advanceIds = oldInvoice.advances.map(a => a.id);

    // 3. Fetch fresh event records
    const [intakes, advances] = await Promise.all([
      prisma.intakeTransaction.findMany({
        where: { id: { in: intakeIds } },
        include: { product: true }
      }),
      prisma.intakeAdvance.findMany({
        where: { id: { in: advanceIds } }
      })
    ]);

    // 4. Resolve adjustments to use (fall back to old invoice adjustments if none provided)
    const adjustmentsToUse = (adjustments && adjustments.length > 0) 
      ? adjustments 
      : (oldInvoice.adjustments || []).map(adj => ({
          adjustmentType: adj.adjustmentType,
          method: adj.method,
          value: Number(adj.value),
          direction: adj.direction
        }));

    // 5. Recalculate
    const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(intakes, adjustmentsToUse);
    const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
    const finalPayableAmount = netValue - totalAdvances;

    const itemsData = intakes.map(intake => {
      const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
      const rate = intake.rate !== null && intake.rate !== undefined ? Number(intake.rate) : 0;
      return {
        intakeTransactionId: intake.id,
        weight: billingWeight,
        rate: rate,
        amount: billingWeight * rate
      };
    });

    // 6. Aggregate calculatedAmount per adjustment
    const processedAdjustments = adjustmentsToUse.map(adj => {
      let totalAmt = 0;
      intakeBreakdowns.forEach(breakdown => {
        const match = breakdown.adjustments.find(
          a => a.adjustmentType === adj.adjustmentType && 
               a.method === adj.method && 
               Number(a.value) === Number(adj.value)
        );
        if (match) {
          totalAmt += match.calculatedAmount;
        }
      });
      return {
        ...adj,
        calculatedAmount: totalAmt
      };
    });

    // 7. Create NEW version
    const invoiceNumber = await SupplierInvoiceRepository.getNextInvoiceNumber();

    const newInvoice = await SupplierInvoiceRepository.createWithItems(
      {
        invoiceNumber,
        partyId: oldInvoice.partyId,
        totalGrossValue,
        totalDeductions,
        totalAdvances,
        finalPayableAmount,
        status: "PENDING",
        version: oldInvoice.version + 1,
        lastCalculatedAt: new Date()
      },
      itemsData,
      advanceIds,
      processedAdjustments
    );

    return JSON.parse(JSON.stringify(newInvoice));
  }
}
