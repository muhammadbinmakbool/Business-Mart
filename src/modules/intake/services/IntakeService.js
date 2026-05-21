import { IntakeRepository } from "../repositories/IntakeRepository";
import { AdvanceRepository } from "../repositories/AdvanceRepository";
import { intakeSchema } from "../validations/intakeSchema";
import { PartyService } from "../../parties/services/PartyService";
import { UnitService } from "../../products/services/UnitService";
import { ProductService } from "../../products/services/ProductService";
import { InventoryService } from "../../products/services/InventoryService";
import { prisma } from "@/lib/prisma";
import { convertRate } from "@/lib/units";


export class IntakeService {
  static async listIntakes() {
    const intakes = await IntakeRepository.getAll();
    return intakes.map(intake => ({
      ...intake,
      grossWeight: Number(intake.grossWeight),
      netWeight: intake.netWeight ? Number(intake.netWeight) : null,
      Bardana: intake.Bardana ? Number(intake.Bardana) : null,
      Khot: intake.Khot ? Number(intake.Khot) : null,
      normalizedWeight: Number(intake.normalizedWeight),
      rate: intake.rate ? Number(intake.rate) : null,
      rateUnit: intake.rateUnit || "KG",
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
      netWeight: intake.netWeight ? Number(intake.netWeight) : null,
      Bardana: intake.Bardana ? Number(intake.Bardana) : null,
      Khot: intake.Khot ? Number(intake.Khot) : null,
      normalizedWeight: Number(intake.normalizedWeight),
      rate: intake.rate ? Number(intake.rate) : null,
      rateUnit: intake.rateUnit || "KG",
      product: intake.product ? {
        ...intake.product,
        quantity: Number(intake.product.quantity),
        unitConversion: intake.product.unitConversion ? Number(intake.product.unitConversion) : null
      } : null,
      advances: intake.advances?.map(a => ({
        ...a,
        amount: Number(a.amount)
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
    
    const normalizedWeight = UnitService.getNormalizedQuantity(validated.grossWeight, validated.unit || "KG", product);
    
    return prisma.$transaction(async (tx) => {
      // 1. Get next number
      const lastEntry = await tx.intakeTransaction.findFirst({
        orderBy: { id: "desc" }
      });
      const nextId = lastEntry ? lastEntry.id + 1 : 1;
      const nextNumber = `INT-${nextId.toString().padStart(6, "0")}`;

      // 2. Create Intake Transaction
      const intake = await tx.intakeTransaction.create({
        data: {
          grossWeight: validated.grossWeight,
          netWeight: validated.netWeight ?? null,
          Bardana: validated.Bardana ?? null,
          Khot: validated.Khot ?? null,
          unit: validated.unit || "KG",
          normalizedWeight,
          rate: validated.rate ?? null,
          rateUnit: validated.rateUnit || "KG",
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

      return intake;
    });
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
      const newStatus = validated.status || oldStatus;

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

      // 3. Delegate inventory recalculation to InventoryService
      //    (handles product changes, weight changes, and status changes)
      await InventoryService.handleIntakeUpdated(oldProductId, newProductId, tx);

      // Calculate converted rates based on the units used!
      const finalSupplierRate = validated.rate !== undefined && validated.rate !== null
        ? validated.rate
        : current.rate;
      const finalSupplierRateUnit = validated.rateUnit !== undefined && validated.rateUnit !== null
        ? validated.rateUnit
        : current.rateUnit || "KG";

      const finalSalesTrackRate = validated.rate !== undefined && validated.rate !== null
        ? convertRate(validated.rate, validated.rateUnit || "KG", "KG")
        : (current.rate ? convertRate(Number(current.rate), current.rateUnit || "KG", "KG") : null);

      // 4. Update the intake record
      const updated = await tx.intakeTransaction.update({
        where: { id: parseInt(id) },
        data: {
          partyId: validated.partyId,
          productId: validated.productId,
          entryDate: validated.entryDate,
          bagCount: validated.bagCount,
          grossWeight: validated.grossWeight,
          unit: validated.unit,
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

      // 5. If status is SOLD and buyer is specified, upsert SalesTrack!
      if (newStatus === "SOLD" && buyerPartyId) {
        const existingTrack = await tx.salesTrack.findFirst({
          where: { intakeTransactionId: updated.id }
        });

        const quantityInKg = updated.unit === "MAUND" 
          ? (updated.netWeight ? Number(updated.netWeight) * 40 : Number(updated.grossWeight) * 40)
          : (updated.netWeight ? Number(updated.netWeight) : Number(updated.grossWeight));

        const weightForTotal = updated.netWeight !== null && updated.netWeight !== undefined 
          ? Number(updated.netWeight) 
          : Number(updated.grossWeight);
        const actualRate = convertRate(updated.rate, updated.rateUnit || "KG", updated.unit || "KG");
        const rateForTotal = actualRate ? Number(actualRate) : 0;
        const baseAmount = weightForTotal * rateForTotal;

        const trackData = {
          intakeTransactionId: updated.id,
          supplierPartyId: updated.partyId,
          buyerPartyId: parseInt(buyerPartyId),
          productId: updated.productId,
          quantity: quantityInKg,
          buyingRate: finalSalesTrackRate,
          sellingRate: finalSalesTrackRate,
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
      netWeight: intake.netWeight ? Number(intake.netWeight) : null,
      Bardana: intake.Bardana ? Number(intake.Bardana) : null,
      Khot: intake.Khot ? Number(intake.Khot) : null,
      normalizedWeight: Number(intake.normalizedWeight),
      rate: intake.rate ? Number(intake.rate) : null,
      rateUnit: intake.rateUnit || "KG",
      product: intake.product ? {
        ...intake.product,
        quantity: Number(intake.product.quantity),
        unitConversion: intake.product.unitConversion ? Number(intake.product.unitConversion) : null
      } : null
    }));
  }

  static async sellIntake(id, data) {
    const intakeId = parseInt(id);
    const buyerPartyId = parseInt(data.buyerPartyId);
    const rate = Number(data.rate);
    const rateUnit = data.rateUnit || "KG";
    const Bardana = Number(data.Bardana) || 0;
    const Khot = Number(data.Khot) || 0;
    const netWeight = Number(data.netWeight) || 0;

    return prisma.$transaction(async (tx) => {
      // 1. Get the current intake record
      const intake = await tx.intakeTransaction.findUnique({
        where: { id: intakeId },
        include: { product: true }
      });
      if (!intake) throw new Error("Intake transaction not found");

      // Calculate converted rates!
      const finalSalesTrackRate = convertRate(rate, rateUnit, "KG");

      // 2. Update Intake Transaction fields
      const updatedIntake = await tx.intakeTransaction.update({
        where: { id: intakeId },
        data: {
          status: "SOLD",
          Bardana,
          Khot,
          netWeight,
          rate: rate,
          rateUnit: rateUnit,
        }
      });

      // 2.5 Delegate inventory update — intake is no longer PENDING
      await InventoryService.handleIntakeSold(intake.productId, tx);

      // 3. Upsert SalesTrack
      const existingTrack = await tx.salesTrack.findFirst({
        where: { intakeTransactionId: intakeId }
      });

      const quantityInKg = intake.unit === "MAUND" ? netWeight * 40 : netWeight;
      const baseAmount = netWeight * convertRate(rate, rateUnit, intake.unit, intake.product);

      const trackData = {
        intakeTransactionId: intakeId,
        supplierPartyId: intake.partyId,
        buyerPartyId,
        productId: intake.productId,
        quantity: quantityInKg,
        buyingRate: finalSalesTrackRate,
        sellingRate: finalSalesTrackRate,
        netWeight,
        baseAmount,
        notes: `Intake ${intake.intakeNumber} marked as SOLD`
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

      return updatedIntake;
    });
  }


  static async deleteIntake(id) {
    return prisma.$transaction(async (tx) => {
      const intake = await tx.intakeTransaction.findUnique({
        where: { id: parseInt(id) }
      });
      if (!intake) throw new Error("Intake transaction not found");

      const productId = intake.productId;

      // Delete linked advances first
      await tx.intakeAdvance.deleteMany({
        where: { intakeTransactionId: parseInt(id) }
      });
      
      const deleted = await tx.intakeTransaction.delete({
        where: { id: parseInt(id) }
      });

      // Delegate inventory recalculation after deleting the intake record
      await InventoryService.handleIntakeDeleted(productId, tx);

      return deleted;
    });
  }
}

