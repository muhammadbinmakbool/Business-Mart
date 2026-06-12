"use server";

import { PartyService } from "../services/PartyService";
import { PartyProfileService } from "../services/PartyProfileService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invalidateCacheBucket } from "@/modules/aggregations/cache";

function invalidatePartiesCache() {
  invalidateCacheBucket("dashboard");
  invalidateCacheBucket("ledger");
  invalidateCacheBucket("supplier");
}

export async function createPartyAction(formData) {
  const data = {
    name: formData.get("name"),
    phoneNumber: formData.get("phoneNumber"),
    address: formData.get("address") || null,
    notes: formData.get("notes") || null,
    partyType: formData.get("partyType"),
    isActive: true,
  };

  try {
    await PartyService.createParty(data);
    revalidatePath("/parties");
    invalidatePartiesCache();
  } catch (error) {
    return { error: "Failed to create party" };
  }
  redirect("/parties");
}

export async function updatePartyAction(id, formData) {
  const data = {
    name: formData.get("name"),
    phoneNumber: formData.get("phoneNumber"),
    address: formData.get("address") || null,
    notes: formData.get("notes") || null,
    partyType: formData.get("partyType"),
    isActive: formData.get("isActive") === "true",
  };

  try {
    await PartyService.updateParty(id, data);
    revalidatePath("/parties");
    revalidatePath(`/parties/${id}`);
    invalidatePartiesCache();
  } catch (error) {
    return { error: "Failed to update party" };
  }
  redirect("/parties");
}

export async function togglePartyStatusAction(id) {
  try {
    const party = await PartyService.togglePartyStatus(id);
    revalidatePath("/parties");
    revalidatePath(`/parties/${id}`);
    invalidatePartiesCache();
    return { success: true, data: party };
  } catch (error) {
    return { error: "Failed to toggle status" };
  }
}

export async function checkPartyDuplicateAction(name, phoneNumber, excludeId = null) {
  try {
    const duplicate = await PartyService.checkDuplicate(name, phoneNumber, excludeId);
    return { success: true, duplicate };
  } catch (error) {
    return { success: false, error: error.message || "Failed to check duplicates" };
  }
}
import { assertDeletePermission } from "@/lib/authGuard";

export async function deletePartyAction(id, confirmPassword, deleteReason) {
  try {
    // Enforce unified record deletion permission and password confirmation check
    await assertDeletePermission(confirmPassword);

    await PartyService.deleteParty(id, deleteReason);
    revalidatePath("/parties");
    invalidatePartiesCache();
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to delete party" };
  }
}

export async function hardDeletePartyAction(id, deleteReason) {
  try {
    // assertDestructiveMode is called inside PartyRepository.hardDelete
    await PartyService.hardDeleteParty(id, deleteReason);
    revalidatePath("/parties");
    invalidatePartiesCache();
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to permanently delete party" };
  }
}

export async function applyPartyPaymentAction(partyId, amount, type) {
  try {
    const result = await PartyProfileService.applyQuickPayment(partyId, amount, type);
    revalidatePath(`/parties/${partyId}`);
    invalidatePartiesCache();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message || "Failed to apply payment" };
  }
}
