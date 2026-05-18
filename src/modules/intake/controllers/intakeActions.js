"use server";

import { IntakeService } from "../services/IntakeService";
import { revalidatePath } from "next/cache";

export async function createIntakeAction(formData) {
  const data = {
    partyId: formData.get("partyId"),
    productId: formData.get("productId"),
    entryDate: formData.get("entryDate"),
    bagCount: formData.get("bagCount") || null,
    grossWeight: formData.get("grossWeight"),
    unit: formData.get("unit") || "KG",
    notes: formData.get("notes") || "",
    newPartyData: formData.get("partyId") === "new" ? {
      name: formData.get("newName"),
      phoneNumber: formData.get("newPhone"),
      address: formData.get("newAddress"),
      notes: formData.get("newPartyNotes"),
      partyType: "SUPPLIER"
    } : null
  };

  const advanceAmount = formData.get("advanceAmount");
  const advanceNotes = formData.get("advanceNotes");

  try {
    if (advanceAmount && parseFloat(advanceAmount) > 0) {
      await IntakeService.createIntakeWithAdvance(data, advanceAmount, advanceNotes);
    } else {
      await IntakeService.createIntake(data);
    }
    
    revalidatePath("/intake");
    return { success: true };
  } catch (error) {
    console.error("Intake creation error:", error);
    return { error: error.message || "Failed to create intake transaction" };
  }
}

export async function updateIntakeStatusAction(id, status) {
  try {
    await IntakeService.updateIntake(id, { status });
    revalidatePath("/intake");
    revalidatePath(`/intake/${id}`);
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to update status" };
  }
}

export async function sellIntakeAction(id, data) {
  try {
    await IntakeService.sellIntake(id, data);
    revalidatePath("/intake");
    revalidatePath(`/intake/${id}`);
    revalidatePath("/source-tracking");
    return { success: true };
  } catch (error) {
    console.error("Error selling intake:", error);
    return { error: error.message || "Failed to sell intake" };
  }
}


export async function updateIntakeAction(id, formData) {
  const data = {
    partyId: formData.get("partyId"),
    productId: formData.get("productId"),
    entryDate: formData.get("entryDate"),
    bagCount: formData.get("bagCount") || null,
    grossWeight: formData.get("grossWeight"),
    unit: formData.get("unit") || "KG",
    notes: formData.get("notes") || "",
    status: formData.get("status"),
    buyerPartyId: formData.get("buyerPartyId") || null,
    rate: formData.get("rate") ? Number(formData.get("rate")) : null,
    rateUnit: formData.get("rateUnit") || "KG",
    Bardana: formData.get("Bardana") ? Number(formData.get("Bardana")) : null,
    Khot: formData.get("Khot") ? Number(formData.get("Khot")) : null,
    netWeight: formData.get("netWeight") ? Number(formData.get("netWeight")) : null,
  };


  try {
    await IntakeService.updateIntake(id, data);
    revalidatePath("/intake");
    revalidatePath(`/intake/${id}`);
    revalidatePath("/source-tracking");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to update intake transaction" };
  }
}

export async function deleteIntakeAction(id) {
  try {
    await IntakeService.deleteIntake(id);
    revalidatePath("/intake");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to delete intake transaction" };
  }
}
