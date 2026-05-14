import { IntakeRepository } from "../repositories/IntakeRepository";
import { AdvanceRepository } from "../repositories/AdvanceRepository";
import { intakeSchema } from "../validations/intakeSchema";
import { PartyService } from "../../parties/services/PartyService";

export class IntakeService {
  static async listIntakes() {
    const intakes = await IntakeRepository.getAll();
    return intakes.map(intake => ({
      ...intake,
      grossWeight: Number(intake.grossWeight)
    }));
  }

  static async getIntake(id) {
    const intake = await IntakeRepository.getById(id);
    if (!intake) return null;

    // Serialize Decimals for Client Components
    return {
      ...intake,
      grossWeight: Number(intake.grossWeight),
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
    return IntakeRepository.create(validated);
  }

  static async updateIntake(id, data) {
    const validated = intakeSchema.partial().parse(data);
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
