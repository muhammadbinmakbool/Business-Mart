import { IntakeRepository } from "../repositories/IntakeRepository";
import { AdvanceRepository } from "../repositories/AdvanceRepository";
import { intakeSchema } from "../validations/intakeSchema";
import { PartyService } from "../../parties/services/PartyService";
import { UnitService } from "../../products/services/UnitService";
import { ProductService } from "../../products/services/ProductService";
import { prisma } from "@/lib/prisma";

export class IntakeService {
  static async listIntakes() {
    const intakes = await IntakeRepository.getAll();
    return intakes.map(intake => ({
      ...intake,
      grossWeight: Number(intake.grossWeight),
      normalizedWeight: Number(intake.normalizedWeight),
      rate: intake.rate ? Number(intake.rate) : null,
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
      normalizedWeight: Number(intake.normalizedWeight),
      rate: intake.rate ? Number(intake.rate) : null,
      product: intake.product ? {
        ...intake.product,
        quantity: Number(intake.product.quantity),
        unitConversion: intake.product.unitConversion ? Number(intake.product.unitConversion) : null
      } : null,
      advances: intake.advances?.map(a => ({
        ...a,
        amount: Number(a.amount)
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
          unit: validated.unit || "KG",
          normalizedWeight,
          rate: validated.rate ?? null,
          notes: validated.notes,
          status: validated.status || "PENDING",
          entryDate: validated.entryDate,
          bagCount: validated.bagCount,
          intakeNumber: nextNumber,
          party: { connect: { id: parseInt(partyId) } },
          product: { connect: { id: parseInt(validated.productId) } }
        }
      });

      // 3. Update Product Snapshot quantity (increment)
      if (validated.status !== "CANCELLED") {
        await tx.product.update({
          where: { id: parseInt(validated.productId) },
          data: { quantity: { increment: normalizedWeight } }
        });
      }

      return intake;
    });
  }

  static async updateIntake(id, data) {
    const validated = intakeSchema.partial().parse(data);
    
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
      const hasWeightChange = data.grossWeight !== undefined;
      const hasUnitChange = data.unit !== undefined;
      const hasProductChange = data.productId !== undefined;

      if (hasWeightChange || hasUnitChange || hasProductChange) {
        const product = await tx.product.findUnique({ where: { id: newProductId } });
        if (!product) throw new Error("Product not found");
        const rawWeight = hasWeightChange ? validated.grossWeight : Number(current.grossWeight);
        const unit = hasUnitChange ? validated.unit : current.unit;
        newWeight = UnitService.getNormalizedQuantity(rawWeight, unit, product);
      }

      // 3. Apply quantity snapshot adjustments
      // Product changed
      if (oldProductId !== newProductId) {
        // Subtract from old product (if it was active)
        if (oldStatus !== "CANCELLED") {
          const oldProduct = await tx.product.findUnique({ where: { id: oldProductId } });
          if (Number(oldProduct.quantity) < oldWeight) {
            throw new Error(`INSUFFICIENT_STOCK: Reverting old product "${oldProduct.name}" stock would result in negative inventory.`);
          }
          await tx.product.update({
            where: { id: oldProductId },
            data: { quantity: { decrement: oldWeight } }
          });
        }

        // Add to new product (if it is active)
        if (newStatus !== "CANCELLED") {
          await tx.product.update({
            where: { id: newProductId },
            data: { quantity: { increment: newWeight } }
          });
        }
      } 
      // Product did not change
      else {
        // Was active, now cancelled -> subtract
        if (oldStatus !== "CANCELLED" && newStatus === "CANCELLED") {
          const product = await tx.product.findUnique({ where: { id: oldProductId } });
          if (Number(product.quantity) < oldWeight) {
            throw new Error(`INSUFFICIENT_STOCK: Reverting intake stock for "${product.name}" would result in negative inventory.`);
          }
          await tx.product.update({
            where: { id: oldProductId },
            data: { quantity: { decrement: oldWeight } }
          });
        }
        // Was cancelled, now active -> add
        else if (oldStatus === "CANCELLED" && newStatus !== "CANCELLED") {
          await tx.product.update({
            where: { id: oldProductId },
            data: { quantity: { increment: newWeight } }
          });
        }
        // Remained active -> apply delta
        else if (oldStatus !== "CANCELLED" && newStatus !== "CANCELLED") {
          const delta = newWeight - oldWeight;
          if (delta < 0) {
            // Decrementing stock: check negative inventory bound
            const product = await tx.product.findUnique({ where: { id: oldProductId } });
            if (Number(product.quantity) < Math.abs(delta)) {
              throw new Error(`INSUFFICIENT_STOCK: Updating intake would reduce "${product.name}" stock below zero.`);
            }
          }
          await tx.product.update({
            where: { id: oldProductId },
            data: { quantity: { increment: delta } }
          });
        }
      }

      // 4. Update the intake record
      return tx.intakeTransaction.update({
        where: { id: parseInt(id) },
        data: {
          ...validated,
          normalizedWeight: newWeight
        }
      });
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
      normalizedWeight: Number(intake.normalizedWeight),
      rate: intake.rate ? Number(intake.rate) : null,
      product: intake.product ? {
        ...intake.product,
        quantity: Number(intake.product.quantity),
        unitConversion: intake.product.unitConversion ? Number(intake.product.unitConversion) : null
      } : null
    }));
  }

  static async deleteIntake(id) {
    return prisma.$transaction(async (tx) => {
      const intake = await tx.intakeTransaction.findUnique({
        where: { id: parseInt(id) }
      });
      if (!intake) throw new Error("Intake transaction not found");

      // Decrement product snapshot stock if delete and intake was active
      if (intake.status !== "CANCELLED") {
        const product = await tx.product.findUnique({ where: { id: intake.productId } });
        if (Number(product.quantity) < Number(intake.normalizedWeight)) {
          throw new Error(`INSUFFICIENT_STOCK: Deleting this intake would reduce "${product.name}" stock below zero.`);
        }

        await tx.product.update({
          where: { id: intake.productId },
          data: { quantity: { decrement: Number(intake.normalizedWeight) } }
        });
      }

      // Delete linked advances first
      await tx.intakeAdvance.deleteMany({
        where: { intakeTransactionId: parseInt(id) }
      });
      
      return tx.intakeTransaction.delete({
        where: { id: parseInt(id) }
      });
    });
  }
}
