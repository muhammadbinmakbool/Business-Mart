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
    notes: formData.get("notes") || "",
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

export async function updateIntakeAction(id, formData) {
  const data = {
    partyId: formData.get("partyId"),
    productId: formData.get("productId"),
    entryDate: formData.get("entryDate"),
    bagCount: formData.get("bagCount") || null,
    grossWeight: formData.get("grossWeight"),
    notes: formData.get("notes") || "",
    status: formData.get("status"),
  };

  try {
    await IntakeService.updateIntake(id, data);
    revalidatePath("/intake");
    revalidatePath(`/intake/${id}`);
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to update intake transaction" };
  }
}
