"use server";

import { PartyService } from "../services/PartyService";
import { PartyInvoiceClearingService } from "@/modules/party-ledger/services/PartyInvoiceClearingService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to create party" };
  }
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
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to update party" };
  }
}

export async function togglePartyStatusAction(id, isActive) {
  try {
    await PartyService.togglePartyStatus(id, isActive);
    revalidatePath("/parties");
  } catch (error) {
    return { error: "Failed to toggle status" };
  }
}
export async function deletePartyAction(id) {
  try {
    await PartyService.deleteParty(id);
    revalidatePath("/parties");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to delete party" };
  }
}

export async function applyPartyPaymentAction(partyId, amount, type) {
  try {
    const result = await PartyInvoiceClearingService.applyPayment(partyId, amount, type);
    revalidatePath(`/parties/${partyId}`);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message || "Failed to apply payment" };
  }
}
