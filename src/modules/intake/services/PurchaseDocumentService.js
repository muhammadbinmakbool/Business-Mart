import { prisma } from "@/lib/prisma";
import { withOwnership } from "@/lib/session";
import { ProductService } from "../../products/services/ProductService";
import { UnitService } from "../../products/services/UnitService";
import { getProductValidationState } from "../../products/utils/productValidation";
import { DEFAULT_WEIGHT_UNIT, normalizeQuantity } from "@/lib/units";
import { IntakeWorkflowEngine } from "../workflow/IntakeWorkflowEngine";
import { InventoryService } from "../../products/services/InventoryService";
import { SupplierInvoiceService } from "../../supplier-invoices/services/SupplierInvoiceService";
import { logIntakeEvent, logPaymentEvent } from "@/modules/activity-log/activityLogger";
import { PartyRepository } from "../../parties/repositories/PartyRepository";

export class PurchaseDocumentService {
  static async createPurchaseDocument(payload) {
    const {
      partyId,
      entryDate,
      items = [],
      adjustments = [],
      amountPaid = 0,
      paymentMethod = "CASH",
      notes = ""
    } = payload;

    if (!partyId) throw new Error("Supplier (Party) is required.");
    if (items.length === 0) throw new Error("At least one product item is required.");

    // Validate all products and active states before starting transaction
    const unitRegistry = await UnitService.getUnitRegistry();
    for (const item of items) {
      if (!item.productId) throw new Error("Product ID is required for all items.");
      if (item.rate === null || item.rate === undefined || Number(item.rate) <= 0) {
        throw new Error("Rate is required and must be greater than zero for all items.");
      }
      const product = await ProductService.getProduct(item.productId);
      if (!product) throw new Error(`Product ID #${item.productId} not found.`);
      if (!product.isActive) {
        throw new Error(`Product "${product.name}" is disabled/inactive.`);
      }
      const validation = getProductValidationState(product);
      if (!validation.isValid) {
        throw new Error(`Product "${product.name}" unit configuration is incomplete. Missing: ${validation.errors.join(", ")}`);
      }
    }

    const ownership = await withOwnership();
    const defaultStatus = await IntakeWorkflowEngine.getDefaultStatus();

    let createdIntakes = [];
    let advanceRecord = null;
    let invoiceRecord = null;

    await prisma.$transaction(async (tx) => {
      // 1. Get starting ID for intake number generation
      const lastEntry = await tx.intakeTransaction.findFirst({
        orderBy: { id: "desc" }
      });
      let baseId = lastEntry ? lastEntry.id + 1 : 1;

      // 2. Create Intake Transactions
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const nextId = baseId + i;
        const intakeNumber = `INT-${nextId.toString().padStart(6, "0")}`;

        const product = await ProductService.getProduct(item.productId);
        const baseQuantity = normalizeQuantity(
          item.grossWeight,
          item.unit || DEFAULT_WEIGHT_UNIT,
          product,
          unitRegistry
        );

        const record = await tx.intakeTransaction.create({
          data: {
            grossWeight: item.grossWeight,
            remainingWeight: item.grossWeight,
            netWeight: item.netWeight ?? null,
            Bardana: item.Bardana ?? null,
            Khot: item.Khot ?? null,
            unit: item.unit || DEFAULT_WEIGHT_UNIT,
            baseQuantity,
            rate: item.rate,
            rateUnit: item.rateUnit || DEFAULT_WEIGHT_UNIT,
            notes: item.notes || notes || "",
            status: defaultStatus,
            entryDate: entryDate ? new Date(entryDate) : new Date(),
            bagCount: item.bagCount || 0,
            packagingMeta: item.packagingMeta ?? null,
            intakeNumber,
            userId: ownership.userId,
            businessId: ownership.businessId,
            partyId: parseInt(partyId),
            productId: parseInt(item.productId)
          }
        });
        createdIntakes.push(record);
      }

      const firstIntake = createdIntakes[0];

      // 3. Create Intake Advance if amountPaid > 0
      const parsedAmountPaid = parseFloat(amountPaid) || 0;
      if (parsedAmountPaid > 0) {
        advanceRecord = await tx.intakeAdvance.create({
          data: {
            partyId: parseInt(partyId),
            intakeTransactionId: firstIntake.id,
            amount: parsedAmountPaid,
            notes: `Payment recorded via Purchase Settlement for Intake ${firstIntake.intakeNumber}`,
            userId: ownership.userId,
            businessId: ownership.businessId
          }
        });
      }

      // 4. Map adjustments to the first created intake internally (isolating the database workaround)
      const adjustmentsByIntake = {};
      if (adjustments && adjustments.length > 0) {
        adjustmentsByIntake[firstIntake.id] = adjustments.map(adj => ({
          adjustmentType: adj.adjustmentType || adj.name,
          code: adj.code || "CUSTOM",
          method: adj.method,
          value: Number(adj.value),
          direction: adj.direction,
          unit: adj.unit || null,
          isUserEditable: typeof adj.isUserEditable !== "undefined" ? adj.isUserEditable : true
        }));
      }

      // 5. Generate Supplier Invoice
      const intakeIds = createdIntakes.map(r => r.id);
      const advanceIds = advanceRecord ? [advanceRecord.id] : [];
      invoiceRecord = await SupplierInvoiceService.generateInvoice(
        parseInt(partyId),
        intakeIds,
        advanceIds,
        adjustmentsByIntake,
        entryDate,
        tx
      );

      // 6. Update inventory balances
      for (const record of createdIntakes) {
        await InventoryService.handleIntakeCreated(record.productId, tx);
      }
    });

    // Logging & activity logging outside of transaction block
    let performedByUserId = 0;
    let performedByName = "system";
    try {
      const { getSession } = await import("@/lib/session");
      const session = await getSession();
      if (session) {
        performedByUserId = session.userId || 0;
        performedByName = session.userName || "system";
      }
    } catch (e) {}

    const party = await PartyRepository.getById(parseInt(partyId));
    const partyName = party ? party.name : "";

    for (const intake of createdIntakes) {
      await logIntakeEvent({
        intakeId: intake.id,
        intakeNumber: intake.intakeNumber,
        partyId: intake.partyId,
        partyName,
        action: "CREATED",
        description: `${performedByName} created Purchase Intake ${intake.intakeNumber} for supplier ${partyName}.`,
        weight: Number(intake.baseQuantity),
        bagCount: intake.bagCount,
        rate: intake.rate,
        performedByUserId,
        performedByName,
        meta: {
          productId: intake.productId,
          supplierInvoiceId: invoiceRecord?.id
        }
      });
    }

    if (advanceRecord) {
      const paymentDescription = `${performedByName} recorded supplier cash payment of Rs. ${Number(advanceRecord.amount).toLocaleString()} for ${partyName} linked to Intake ${createdIntakes[0].intakeNumber}.`;
      await logPaymentEvent({
        partyId: parseInt(partyId),
        partyName,
        paymentType: "CASH_OUT",
        eventType: "CASH_ADVANCE",
        amount: Number(advanceRecord.amount),
        description: paymentDescription,
        performedByUserId,
        performedByName,
        meta: {
          advanceId: advanceRecord.id,
          notes: advanceRecord.notes
        }
      });
    }

    return {
      success: true,
      invoice: invoiceRecord,
      intakes: createdIntakes
    };
  }
}
