import { PartyRepository } from "../repositories/PartyRepository";
import { partySchema } from "../validations/partySchema";
import { emitActivity } from "@/modules/activity-log/activityLogger";

export class PartyService {
  static async listParties() {
    return await PartyRepository.getAll();
  }

  static async getParty(id) {
    return await PartyRepository.getById(id);
  }

  static async createParty(data) {
    const validatedData = partySchema.parse(data);
    const party = await PartyRepository.create(validatedData);
    await emitActivity({
      entityType: "PARTY",
      entityId: party.id,
      action: "CREATED",
      description: `Party "${party.name}" created as ${party.partyType}`,
      meta: { name: party.name, partyType: party.partyType }
    });
    return party;
  }

  static async updateParty(id, data) {
    const validatedData = partySchema.parse(data);
    const party = await PartyRepository.update(id, validatedData);
    await emitActivity({
      entityType: "PARTY",
      entityId: party.id,
      action: "UPDATED",
      description: `Party "${party.name}" updated`,
      meta: { name: party.name, partyType: party.partyType }
    });
    return party;
  }

  static async togglePartyStatus(id, isActive) {
    const party = await PartyRepository.toggleStatus(id, isActive);
    await emitActivity({
      entityType: "PARTY",
      entityId: party.id,
      action: "UPDATED",
      description: `Party "${party.name}" status toggled to ${isActive ? "Active" : "Inactive"}`,
      meta: { name: party.name, isActive }
    });
    return party;
  }
  static async deleteParty(id) {
    const party = await PartyRepository.delete(id);
    await emitActivity({
      entityType: "PARTY",
      entityId: party.id,
      action: "DELETED",
      description: `Party "${party.name}" deleted`,
      meta: { name: party.name }
    });
    return party;
  }
}
