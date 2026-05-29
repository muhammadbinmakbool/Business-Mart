import { IntakeRepository } from "../repositories/IntakeRepository";
import { AdvanceRepository } from "../repositories/AdvanceRepository";
import { intakeSchema } from "../validations/intakeSchema";
import { PartyService } from "../../parties/services/PartyService";
import { UnitService } from "../../products/services/UnitService";
import { ProductService } from "../../products/services/ProductService";
import { InventoryService } from "../../products/services/InventoryService";
import { prisma } from "@/lib/prisma";
import { convertRate, DEFAULT_UNIT } from "@/lib/units";
import { createAppError } from "@/lib/errors/AppError";
import { emitActivity } from "@/modules/activity-log/activityLogger";
import { calculateIntakeState } from "@/lib/financial";


export class IntakeService {
  static async listIntakes() {
    const intakes = await IntakeRepository.getAll();
    return intakes.map(intake => ({
      ...intake,
      grossWeight: Number(intake.grossWeight),
      remainingWeight: intake.remainingWeight !== null && intake.remainingWeight !== undefined ? Number(intake.remainingWeight) : null,
      netWeight: intake.netWeight ? Number(intake.netWeight) : null,
      Bardana: intake.Bardana ? Number(intake.Bardana) : null,
      Khot: intake.Khot ? Number(intake.Khot) : null,
      normalizedWeight: Number(intake.normalizedWeight),
      rate: intake.rate ? Number(intake.rate) : null,
      rateUnit: intake.rateUnit || DEFAULT_UNIT,
      product: intake.product ? {
        ...intake.product,
        quantity: Number(intake.product.quantity),
        unitConversion: intake.product.unitConversion ? Number(intake.product.unitConversion) : null
      } : null
    }));
  }

  static async getIntake(id) {
    const intake = await IntakeRepository.getById(id);
    if (!intake) return null;

    // Serialize Decimals for Client Components
    return {
      ...intake,
      grossWeight: Number(intake.grossWeight),
      remainingWeight: intake.remainingWeight !== null && intake.remainingWeight !== undefined ? Number(intake.remainingWeight) : null,
      netWeight: intake.netWeight ? Number(intake.netWeight) : null,
      Bardana: intake.Bardana ? Number(intake.Bardana) : null,
      Khot: intake.Khot ? Number(intake.Khot) : null,
      normalizedWeight: Number(intake.normalizedWeight),
      rate: intake.rate ? Number(intake.rate) : null,
      rateUnit: intake.rateUnit || DEFAULT_UNIT,
      product: intake.product ? {
        ...intake.product,
        quantity: Number(intake.product.quantity),
        unitConversion: intake.product.unitConversion ? Number(intake.product.unitConversion) : null
      } : null,
      advances: intake.advances?.map(a => ({
        ...a,
        amount: Number(a.amount)
      })),
      invoiceItems: intake.invoiceItems?.map(ii => ({
        ...ii,
        weight: Number(ii.weight),
        rate: Number(ii.rate),
        amount: Number(ii.amount),
        invoice: ii.invoice ? {
          ...ii.invoice,
          totalGrossValue: Number(ii.invoice.totalGrossValue),
          totalDeductions: Number(ii.invoice.totalDeductions),
          totalAdvances: Number(ii.invoice.totalAdvances),
          finalPayableAmount: Number(ii.invoice.finalPayableAmount),
          paidAmount: Number(ii.invoice.paidAmount)
        } : null
      })),
      salesTracks: intake.salesTracks?.map(st => ({
        ...st,
        quantity: Number(st.quantity),
        buyingRate: st.buyingRate ? Number(st.buyingRate) : null,
        sellingRate: st.sellingRate ? Number(st.sellingRate) : null,
        netWeight: st.netWeight ? Number(st.netWeight) : null,
        baseAmount: st.baseAmount ? Number(st.baseAmount) : null,
        buyer: st.buyer ? {
          ...st.buyer
        } : null
      }))
    };
  }


  static async createIntake(data) {
    let { partyId, newPartyData, ...intakeData } = data;

    if (partyId === "new" && newPartyData) {
      const newParty = await PartyService.createParty(newPartyData);
      partyId = newParty.id;
    }

    const validated = intakeSchema.parse({ ...intakeData, partyId });
    
    // Normalize weight
    const product = await ProductService.getProduct(validated.productId);
    if (!product) throw new Error("Product not found");
    
    const normalizedWeight = UnitService.getNormalizedQuantity(validated.grossWeight, validated.unit || DEFAULT_UNIT, product);
    
    const intake = await prisma.$transaction(async (tx) => {
      // 1. Get next number
      const lastEntry = await tx.intakeTransaction.findFirst({
        orderBy: { id: "desc" }
      });
      const nextId = lastEntry ? lastEntry.id + 1 : 1;
      const nextNumber = `INT-${nextId.toString().padStart(6, "0")}`;

      // 2. Create Intake Transaction
      const record = await tx.intakeTransaction.create({
        data: {
          grossWeight: validated.grossWeight,
          remainingWeight: validated.grossWeight,
          netWeight: validated.netWeight ?? null,
          Bardana: validated.Bardana ?? null,
          Khot: validated.Khot ?? null,
          unit: validated.unit || DEFAULT_UNIT,
          normalizedWeight,
          rate: validated.rate ?? null,
          rateUnit: validated.rateUnit || DEFAULT_UNIT,
          notes: validated.notes,
          status: validated.status || "PENDING",
          entryDate: validated.entryDate,
          bagCount: validated.bagCount,
          intakeNumber: nextNumber,
          party: { connect: { id: parseInt(partyId) } },
          product: { connect: { id: parseInt(validated.productId) } }
        }
      });

      // 3. Delegate inventory update to InventoryService
      await InventoryService.handleIntakeCreated(parseInt(validated.productId), tx);

      return record;
    });

    await emitActivity({
      entityType: "INTAKE",
      entityId: intake.id,
      action: "CREATED",
      description: `Intake ${intake.intakeNumber} created for supplier`,
      meta: {
        productId: intake.productId,
        weight: Number(intake.normalizedWeight),
        bagCount: intake.bagCount,
        supplierId: intake.partyId
      }
    });

    return intake;
  }

  static async updateIntake(id, data) {
    const { buyerPartyId, ...rest } = data;
    const validated = intakeSchema.partial().parse(rest);
    
    return prisma.$transaction(async (tx) => {
      // 1. Get current state
      const current = await tx.intakeTransaction.findUnique({
        where: { id: parseInt(id) }
      });
      if (!current) throw new Error("Intake transaction not found");

      const oldProductId = current.productId;
      const oldWeight = Number(current.normalizedWeight);
      const oldStatus = current.status;

      // 2. Determine new values
      const newProductId = validated.productId ? parseInt(validated.productId) : oldProductId;
      let newStatus = validated.status || oldStatus;
      let newRemainingWeight;

      // Validation Rule: If transitioning away from SOLD, CLEARED, or PARTIAL to PENDING or CANCELLED, verify/delete unbilled SalesTrack and block if included in Supplier Settlement
      if ((oldStatus === "SOLD" || oldStatus === "CLEARED" || oldStatus === "PARTIAL") && (newStatus === "PENDING" || newStatus === "CANCELLED")) {
        // Check for Supplier Settlement linkage
        const supplierInvoiceItem = await tx.supplierInvoiceItem.findFirst({
          where: { intakeTransactionId: current.id }
        });
        if (supplierInvoiceItem) {
          throw createAppError("SETTLEMENT_LOCKED", "Cannot change status because this intake is already included in a Supplier Settlement/Invoice. Please remove it from the supplier settlement first.");
        }

        const existingTracks = await tx.salesTrack.findMany({
          where: { intakeTransactionId: current.id }
        });

        if (existingTracks.length > 0) {
          const billedTrack = existingTracks.find(t => t.isBilled || t.saleTransactionId !== null);
          if (billedTrack) {
            throw createAppError("TRANSACTION_BILLED", "Cannot change status because this intake's sales trace is already included in a Sales Invoice. Please remove it from the invoice first.");
          }
          // If not billed, delete all SalesTrack records atomically
          await tx.salesTrack.deleteMany({
            where: { intakeTransactionId: current.id }
          });
        }

        // Reset remainingWeight to full grossWeight when reverting to PENDING/CANCELLED
        newRemainingWeight = Number(validated.grossWeight !== undefined ? validated.grossWeight : current.grossWeight);
      }

      // Recalculate normalized weight if weight, unit, or product changed
      let newWeight = oldWeight;
      const hasWeightChange = rest.grossWeight !== undefined;
      const hasUnitChange = rest.unit !== undefined;
      const hasProductChange = rest.productId !== undefined;

      if (hasWeightChange || hasUnitChange || hasProductChange) {
        const product = await tx.product.findUnique({ where: { id: newProductId } });
        if (!product) throw new Error("Product not found");
        const rawWeight = hasWeightChange ? validated.grossWeight : Number(current.grossWeight);
        const unit = hasUnitChange ? validated.unit : current.unit;
        newWeight = UnitService.getNormalizedQuantity(rawWeight, unit, product);
      }

      // Recalculate remainingWeight safely if grossWeight changed
      if (newRemainingWeight === undefined) {
        newRemainingWeight = current.remainingWeight !== null ? Number(current.remainingWeight) : Number(current.grossWeight);
      }
      if (hasWeightChange) {
        const oldGross = Number(current.grossWeight);
        const newGross = Number(validated.grossWeight);
        const soldWeight = oldGross - (current.remainingWeight !== null ? Number(current.remainingWeight) : oldGross);

        if (newGross < soldWeight) {
          throw new Error(`Gross weight cannot be less than the already sold weight of ${soldWeight} ${current.unit || DEFAULT_UNIT}.`);
        }

        if (current.status === "PENDING") {
          newRemainingWeight = newGross;
        } else {
          const delta = newGross - oldGross;
          newRemainingWeight = Math.max(0, newRemainingWeight + delta);
        }

        // Recalculate status dynamically if the weight shift changes the intake state
        newStatus = calculateIntakeState({ grossWeight: newGross, remainingWeight: newRemainingWeight }).status;
      }

      // Calculate converted rates based on the units used!
      const finalSupplierRate = validated.rate !== undefined && validated.rate !== null
        ? validated.rate
        : current.rate;
      const finalSupplierRateUnit = validated.rateUnit !== undefined && validated.rateUnit !== null
        ? validated.rateUnit
        : current.rateUnit || DEFAULT_UNIT;

      const finalSalesTrackRate = validated.rate !== undefined && validated.rate !== null
        ? validated.rate
        : current.rate;

      // 3. Update the intake record FIRST
      const updated = await tx.intakeTransaction.update({
        where: { id: parseInt(id) },
        data: {
          partyId: validated.partyId,
          productId: validated.productId,
          entryDate: validated.entryDate,
          bagCount: validated.bagCount,
          grossWeight: validated.grossWeight,
          remainingWeight: newRemainingWeight,
          unit: validated.unit !== undefined ? validated.unit : current.unit,
          normalizedWeight: newWeight,
          notes: validated.notes,
          status: newStatus,
          rate: finalSupplierRate,
          rateUnit: finalSupplierRateUnit,
          Bardana: validated.Bardana !== undefined ? validated.Bardana : current.Bardana,
          Khot: validated.Khot !== undefined ? validated.Khot : current.Khot,
          netWeight: validated.netWeight !== undefined ? validated.netWeight : current.netWeight,
        }
      });

      // 4. Delegate inventory recalculation to InventoryService AFTER the record update
      //    (the SUM query now sees the new status, weight, and product)
      await InventoryService.handleIntakeUpdated(oldProductId, newProductId, tx);

      // 5. If status is SOLD and buyer is specified, upsert SalesTrack!
      if (newStatus === "SOLD" && buyerPartyId) {
        const existingTrack = await tx.salesTrack.findFirst({
          where: { intakeTransactionId: updated.id }
        });

        const product = await tx.product.findUnique({ where: { id: updated.productId } });
        const weightForTotal = updated.netWeight !== null && updated.netWeight !== undefined 
          ? Number(updated.netWeight) 
          : Number(updated.grossWeight);
        const quantityInKg = UnitService.getNormalizedQuantity(weightForTotal, updated.unit, product);
        const actualRate = convertRate(updated.rate, updated.rateUnit || DEFAULT_UNIT, updated.unit || DEFAULT_UNIT, product);
        const rateForTotal = actualRate ? Number(actualRate) : 0;
        const baseAmount = weightForTotal * rateForTotal;

        const trackData = {
          intakeTransactionId: updated.id,
          supplierPartyId: updated.partyId,
          buyerPartyId: parseInt(buyerPartyId),
          productId: updated.productId,
          quantity: weightForTotal,
          buyingRate: finalSalesTrackRate,
          sellingRate: finalSalesTrackRate,
          rateUnit: finalSupplierRateUnit,
          netWeight: updated.netWeight !== null && updated.netWeight !== undefined ? Number(updated.netWeight) : null,
          baseAmount: baseAmount,
          notes: `Intake ${updated.intakeNumber} updated and marked as SOLD`
        };

        if (existingTrack) {
          await tx.salesTrack.update({
            where: { id: existingTrack.id },
            data: trackData
          });
        } else {
          await tx.salesTrack.create({
            data: trackData
          });
        }
      }

      return updated;
    });

    await emitActivity({
      entityType: "INTAKE",
      entityId: updated.id,
      action: "UPDATED",
      description: `Intake ${updated.intakeNumber} updated (Status: ${updated.status})`,
      meta: {
        productId: updated.productId,
        weight: Number(updated.normalizedWeight),
        bagCount: updated.bagCount,
        supplierId: updated.partyId,
        status: updated.status
      }
    });

    return updated;
  }



  static async createIntakeWithAdvance(intakeData, advanceAmount, advanceNotes) {
    const intake = await this.createIntake(intakeData);
    
    if (advanceAmount && parseFloat(advanceAmount) > 0) {
      await AdvanceRepository.create({
        partyId: intake.partyId,
        intakeTransactionId: intake.id,
        amount: parseFloat(advanceAmount),
        notes: advanceNotes || `Advance for Intake ${intake.intakeNumber}`
      });
    }
    
    return intake;
  }

  static async listUninvoicedIntakes(partyId) {
    const intakes = await IntakeRepository.getUninvoicedByPartyId(partyId);
    return intakes.map(intake => ({
      ...intake,
      grossWeight: Number(intake.grossWeight),
      remainingWeight: intake.remainingWeight !== null && intake.remainingWeight !== undefined ? Number(intake.remainingWeight) : null,
      netWeight: intake.netWeight ? Number(intake.netWeight) : null,
      Bardana: intake.Bardana ? Number(intake.Bardana) : null,
      Khot: intake.Khot ? Number(intake.Khot) : null,
      normalizedWeight: Number(intake.normalizedWeight),
      rate: intake.rate ? Number(intake.rate) : null,
      rateUnit: intake.rateUnit || DEFAULT_UNIT,
      product: intake.product ? {
        ...intake.product,
        quantity: Number(intake.product.quantity),
        unitConversion: intake.product.unitConversion ? Number(intake.product.unitConversion) : null
      } : null,
      salesTracks: (intake.salesTracks || []).map(track => ({
        ...track,
        quantity: Number(track.quantity),
        buyingRate: track.buyingRate ? Number(track.buyingRate) : null,
        sellingRate: track.sellingRate ? Number(track.sellingRate) : null,
        netWeight: track.netWeight ? Number(track.netWeight) : null,
        baseAmount: track.baseAmount ? Number(track.baseAmount) : null,
      }))
    }));
  }

  static async sellIntake(id, data) {
    const intakeId = parseInt(id);
    const buyerPartyId = parseInt(data.buyerPartyId);
    const rate = Number(data.rate);
    const rateUnit = data.rateUnit || DEFAULT_UNIT;
    const Bardana = Number(data.Bardana) || 0;
    const Khot = Number(data.Khot) || 0;
    const netWeight = Number(data.netWeight) || 0;

    const isPartial = !!data.isPartialSale;

    const updatedIntake = await prisma.$transaction(async (tx) => {
      // 1. Get the current intake record
      const intake = await tx.intakeTransaction.findUnique({
        where: { id: intakeId },
        include: { product: true }
      });
      if (!intake) throw new Error("Intake transaction not found");

      if (intake.status === "CANCELLED") {
        throw new Error("Cannot sell a cancelled intake");
      }
      if (intake.status === "SOLD") {
        throw new Error("This intake is already fully sold");
      }

      const defaultSellWeight = intake.remainingWeight !== null ? Number(intake.remainingWeight) : Number(intake.grossWeight);
      const soldQty = isPartial ? Number(data.soldQuantity) : defaultSellWeight;

      if (isNaN(soldQty) || soldQty <= 0) {
        throw new Error("Sold quantity must be greater than zero");
      }
      if (soldQty > defaultSellWeight) {
        throw new Error(`Sold quantity ${soldQty} exceeds remaining weight ${defaultSellWeight}`);
      }

      const newRemainingWeight = defaultSellWeight - soldQty;
      const { status: newStatus } = calculateIntakeState({
        grossWeight: Number(intake.grossWeight),
        remainingWeight: newRemainingWeight
      });

      // Calculate converted rates!
      const finalSalesTrackRate = rate;

      // 2. Update Intake Transaction fields
      const updatedIntake = await tx.intakeTransaction.update({
        where: { id: intakeId },
        data: {
          status: newStatus,
          remainingWeight: newRemainingWeight,
          Bardana: Number(intake.Bardana || 0) + Bardana,
          Khot: Number(intake.Khot || 0) + Khot,
          netWeight: Number(intake.netWeight || 0) + netWeight,
        }
      });

      // 2.5 Delegate inventory update — intake is updated
      await InventoryService.handleIntakeSold(intake.productId, tx);

      // 3. Create unique SalesTrack record for this partial sale portion
      const quantityInKg = UnitService.getNormalizedQuantity(netWeight, intake.unit, intake.product);
      const baseAmount = netWeight * convertRate(rate, rateUnit, intake.unit, intake.product);

      const trackData = {
        intakeTransactionId: intakeId,
        supplierPartyId: intake.partyId,
        buyerPartyId,
        productId: intake.productId,
        quantity: netWeight,
        buyingRate: finalSalesTrackRate,
        sellingRate: finalSalesTrackRate,
        rateUnit: rateUnit,
        netWeight: netWeight,
        baseAmount: baseAmount,
        notes: `Intake ${intake.intakeNumber} marked as ${newStatus}`
      };

      await tx.salesTrack.create({
        data: trackData
      });

      return updatedIntake;
    });

    await emitActivity({
      entityType: "INTAKE",
      entityId: updatedIntake.id,
      action: updatedIntake.status === "SOLD" ? "SOLD" : "PARTIALLY_SOLD",
      description: `Intake ${updatedIntake.intakeNumber} marked as ${updatedIntake.status}`,
      meta: {
        productId: updatedIntake.productId,
        weight: Number(updatedIntake.netWeight || updatedIntake.grossWeight),
        supplierId: updatedIntake.partyId,
        rate: Number(updatedIntake.rate),
        remainingWeight: Number(updatedIntake.remainingWeight)
      }
    });

    return updatedIntake;
  }


  static async deleteIntake(id) {
    const deleted = await prisma.$transaction(async (tx) => {
      const intake = await tx.intakeTransaction.findUnique({
        where: { id: parseInt(id) }
      });
      if (!intake) throw new Error("Intake transaction not found");

      const productId = intake.productId;

      // Delete linked advances first
      await tx.intakeAdvance.deleteMany({
        where: { intakeTransactionId: parseInt(id) }
      });
      
      const record = await tx.intakeTransaction.delete({
        where: { id: parseInt(id) }
      });

      // Delegate inventory recalculation after deleting the intake record
      await InventoryService.handleIntakeDeleted(productId, tx);

      return record;
    });

    await emitActivity({
      entityType: "INTAKE",
      entityId: deleted.id,
      action: "DELETED",
      description: `Intake ${deleted.intakeNumber} deleted`,
      meta: {
        productId: deleted.productId,
        weight: Number(deleted.normalizedWeight),
        supplierId: deleted.partyId
      }
    });

    return deleted;
  }
}

