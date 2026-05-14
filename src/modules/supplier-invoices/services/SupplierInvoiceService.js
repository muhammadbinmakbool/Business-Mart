import { SupplierInvoiceRepository } from "../repositories/SupplierInvoiceRepository";
import { calculateSupplierDeductions } from "@/lib/financial";
import { prisma } from "@/lib/prisma";

export class SupplierInvoiceService {
  /**
   * Generates a new supplier invoice snapshot.
   */
  static async generateInvoice(partyId, intakeIds, advanceIds, config = {}) {
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
    const { totalGrossValue, totalDeductions, netValue } = calculateSupplierDeductions(intakes, config);
    const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
    const finalPayableAmount = netValue - totalAdvances;

    // 3. Prepare immutable snapshots for items
    const itemsData = intakes.map(intake => ({
      intakeTransactionId: intake.id,
      weight: intake.grossWeight,
      rate: intake.rate,
      amount: Number(intake.grossWeight) * Number(intake.rate)
    }));

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
  static async regenerateInvoice(oldInvoiceId, config = {}) {
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

    // 4. Recalculate
    const { totalGrossValue, totalDeductions, netValue } = calculateSupplierDeductions(intakes, config);
    const totalAdvances = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
    const finalPayableAmount = netValue - totalAdvances;

    const itemsData = intakes.map(intake => ({
      intakeTransactionId: intake.id,
      weight: intake.grossWeight,
      rate: intake.rate,
      amount: Number(intake.grossWeight) * Number(intake.rate)
    }));

    // 5. Create NEW version (new record, new sequence number for now to satisfy @unique)
    // In a future refactor, we might want SUP-XXXXXX-V2 format.
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
