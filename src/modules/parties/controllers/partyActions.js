"use server";

import { PartyService } from "../services/PartyService";
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
  };

  try {
    await PartyService.updateParty(id, data);
    revalidatePath("/parties");
    revalidatePath(`/parties/${id}`);
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
    return { success: true, data: party };
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
