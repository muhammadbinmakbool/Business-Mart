import { SupplierInvoiceRepository } from "../repositories/SupplierInvoiceRepository";
import { calculateSupplierDeductions } from "@/lib/financial";
import { prisma } from "@/lib/prisma";

export class SupplierInvoiceService {
  /**
   * Generates a new supplier invoice snapshot.
   */
  static async generateInvoice(partyId, intakeIds, advanceIds, adjustmentsByIntake = {}) {
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
      const rate = intake.rate !== null && intake.rate !== undefined ? Number(intake.rate) : 0;
      
      const breakdown = intakeBreakdowns.find(b => b.intakeId === intake.id);
      const itemAdjustments = breakdown ? breakdown.adjustments : [];

      return {
        intakeTransactionId: intake.id,
        weight: billingWeight,
        rate: rate,
        amount: billingWeight * rate,
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

    return JSON.parse(JSON.stringify(invoice));
  }

  /**
   * Regenerates a new version of an invoice, preserving the old one.
   */
  static async regenerateInvoice(oldInvoiceId, adjustmentsByIntake = null) {
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

    // 5. Map adjustments and recalculate
    const intakesWithAdjustments = intakes.map(intake => ({
      ...intake,
      adjustments: adjustmentsToUse[intake.id] || []
    }));

    const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(intakesWithAdjustments);
    const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
    const finalPayableAmount = netValue - totalAdvances;

    // 6. Prepare item snapshots
    const itemsData = intakes.map(intake => {
      const billingWeight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
      const rate = intake.rate !== null && intake.rate !== undefined ? Number(intake.rate) : 0;
      
      const breakdown = intakeBreakdowns.find(b => b.intakeId === intake.id);
      const itemAdjustments = breakdown ? breakdown.adjustments : [];

      return {
        intakeTransactionId: intake.id,
        weight: billingWeight,
        rate: rate,
        amount: billingWeight * rate,
        adjustments: itemAdjustments
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
      advanceIds
    );

    return JSON.parse(JSON.stringify(newInvoice));
  }
}
