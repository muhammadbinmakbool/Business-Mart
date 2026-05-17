import { IntakeRepository } from "../repositories/IntakeRepository";
import { AdvanceRepository } from "../repositories/AdvanceRepository";
import { intakeSchema } from "../validations/intakeSchema";
import { PartyService } from "../../parties/services/PartyService";
import { UnitService } from "../../products/services/UnitService";
import { ProductService } from "../../products/services/ProductService";


export class IntakeService {
  static async listIntakes() {
    const intakes = await IntakeRepository.getAll();
    return intakes.map(intake => ({
      ...intake,
      grossWeight: Number(intake.grossWeight),
      rate: intake.rate ? Number(intake.rate) : null
    }));
  }

  static async getIntake(id) {
    const intake = await IntakeRepository.getById(id);
    if (!intake) return null;

    // Serialize Decimals for Client Components
    return {
      ...intake,
      grossWeight: Number(intake.grossWeight),
      rate: intake.rate ? Number(intake.rate) : null,
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
    
    return IntakeRepository.create({
      ...validated,
      normalizedWeight
    });
  }

  static async updateIntake(id, data) {
    const validated = intakeSchema.partial().parse(data);
    
    // If weight or unit changed, re-normalize
    if (validated.grossWeight || validated.unit || validated.productId) {
        const currentIntake = await IntakeRepository.getById(id);
        const productId = validated.productId || currentIntake.productId;
        const product = await ProductService.getProduct(productId);
        
        const weight = validated.grossWeight || Number(currentIntake.grossWeight);
        const unit = validated.unit || currentIntake.unit;
        
        validated.normalizedWeight = UnitService.getNormalizedQuantity(weight, unit, product);
    }
    
    return IntakeRepository.update(id, validated);
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
      rate: Number(intake.rate)
    }));
  }

  static async deleteIntake(id) {
    return IntakeRepository.delete(id);
  }
}
