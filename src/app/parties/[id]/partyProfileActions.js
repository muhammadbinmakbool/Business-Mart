"use server";

import { PartyProfileService } from "@/modules/parties/services/PartyProfileService";

/**
 * Server action to fetch the unified financial profile for a party.
 * Returns null if party not found.
 */
export async function getPartyProfileAction(partyId) {
  try {
    const profile = await PartyProfileService.getPartyProfile(partyId);
    if (!profile) return { success: false, error: "Party not found" };

    // Serialize dates for client transport
    return {
      success: true,
      data: JSON.parse(JSON.stringify(profile))
    };
  } catch (error) {
    console.error("getPartyProfileAction error:", error);
    return { success: false, error: error.message || "Failed to load party profile" };
  }
}
