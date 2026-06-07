import { PartyRepository } from "../repositories/PartyRepository";
import { partySchema } from "../validations/partySchema";
import { emitActivity, logPartyEvent } from "@/modules/activity-log/activityLogger";
import { withOwnership } from "@/lib/session";
import { checkDuplicateRecord } from "@/lib/database/duplicateChecker";

export class PartyService {
  static async listParties() {
    return await PartyRepository.getAll();
  }

  static async getParty(id) {
    return await PartyRepository.getById(id);
  }

  static async createParty(data) {
    const validatedData = partySchema.parse(data);
    const ownedData = await withOwnership(validatedData);
    const party = await PartyRepository.create(ownedData);
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
    const ownedData = await withOwnership(validatedData);
    const party = await PartyRepository.update(id, ownedData);
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
    let targetActive = isActive;
    if (targetActive === undefined || targetActive === null) {
      const existing = await PartyRepository.getById(id);
      if (!existing) throw new Error("Party not found");
      targetActive = !existing.isActive;
    }

    const party = await PartyRepository.toggleStatus(id, targetActive);

    // Get session context safely
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

    const description = `${performedByName} changed status of Party "${party.name}" to ${party.isActive ? "Active" : "Inactive"}.`;

    await logPartyEvent({
      partyId: party.id,
      partyName: party.name,
      action: "UPDATED",
      description,
      performedByUserId,
      performedByName,
      meta: {
        isActive: party.isActive
      }
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

  static async checkDuplicate(name, phoneNumber, excludeId = null) {
    return await checkDuplicateRecord("party", { name, phoneNumber }, { excludeId });
  }
}
