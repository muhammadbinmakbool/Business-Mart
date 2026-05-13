import { PartyRepository } from "../repositories/PartyRepository";
import { partySchema } from "../validations/partySchema";

export class PartyService {
  static async listParties() {
    return await PartyRepository.getAll();
  }

  static async getParty(id) {
    return await PartyRepository.getById(id);
  }

  static async createParty(data) {
    const validatedData = partySchema.parse(data);
    return await PartyRepository.create(validatedData);
  }

  static async updateParty(id, data) {
    const validatedData = partySchema.parse(data);
    return await PartyRepository.update(id, validatedData);
  }

  static async togglePartyStatus(id, isActive) {
    return await PartyRepository.toggleStatus(id, isActive);
  }
  static async deleteParty(id) {
    return await PartyRepository.delete(id);
  }
}
