import { AdvanceRepository } from "../repositories/AdvanceRepository";
import { advanceSchema } from "../validations/intakeSchema";

export class AdvanceService {
  static async listAdvances() {
    const advances = await AdvanceRepository.getAll();
    return advances.map(a => ({
      ...a,
      amount: Number(a.amount)
    }));
  }

  static async recordAdvance(data) {
    const validated = advanceSchema.parse(data);
    return AdvanceRepository.create(validated);
  }

  static async getPartyAdvances(partyId) {
    const advances = await AdvanceRepository.getByPartyId(partyId);
    return advances.map(a => ({
      ...a,
      amount: Number(a.amount)
    }));
  }
}
