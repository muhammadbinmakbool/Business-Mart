"use server";

import { IntakeService } from "../services/IntakeService";
import { revalidatePath } from "next/cache";
import { DEFAULT_WEIGHT_UNIT } from "@/lib/units";
import { invalidateCacheBucket } from "@/modules/aggregations/cache";

function invalidateIntakeCache() {
  invalidateCacheBucket("dashboard");
  invalidateCacheBucket("supplier");
}

export async function createIntakeAction(formData) {
  const data = {
    partyId: formData.get("partyId"),
    productId: formData.get("productId"),
    entryDate: formData.get("entryDate"),
    bagCount: formData.get("bagCount") || null,
    grossWeight: formData.get("grossWeight"),
    unit: formData.get("unit") || DEFAULT_WEIGHT_UNIT,
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
    invalidateIntakeCache();
    return { success: true };
  } catch (error) {
    console.error("Intake creation error:", error);
    return { error: error.message || "Failed to create intake transaction" };
  }
}

export async function updateIntakeStatusAction(id, status, notes) {
  try {
    await IntakeService.updateIntake(id, { status, notes });
    revalidatePath("/intake");
    revalidatePath(`/intake/${id}`);
    invalidateIntakeCache();
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
    invalidateIntakeCache();
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
    unit: formData.get("unit") || DEFAULT_WEIGHT_UNIT,
    notes: formData.get("notes") || "",
    status: formData.get("status"),
    buyerPartyId: formData.get("buyerPartyId") || null,
    rate: formData.get("rate") ? Number(formData.get("rate")) : null,
    rateUnit: formData.get("rateUnit") || DEFAULT_WEIGHT_UNIT,
    Bardana: formData.get("Bardana") ? Number(formData.get("Bardana")) : null,
    Khot: formData.get("Khot") ? Number(formData.get("Khot")) : null,
    netWeight: formData.get("netWeight") ? Number(formData.get("netWeight")) : null,
  };


  try {
    await IntakeService.updateIntake(id, data);
    revalidatePath("/intake");
    revalidatePath(`/intake/${id}`);
    revalidatePath("/source-tracking");
    invalidateIntakeCache();
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to update intake transaction" };
  }
}

import { assertDeletePermission } from "@/lib/authGuard";

export async function deleteIntakeAction(id, confirmPassword, deleteReason) {
  try {
    // Enforce unified record deletion permission and password confirmation check
    await assertDeletePermission(confirmPassword);

    await IntakeService.deleteIntake(id, deleteReason);
    revalidatePath("/intake");
    invalidateIntakeCache();
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to delete intake transaction" };
  }
}

export async function hardDeleteIntakeAction(id, deleteReason) {
  try {
    // assertDestructiveMode is called inside IntakeRepository.hardDelete
    await IntakeService.hardDeleteIntake(id, deleteReason);
    revalidatePath("/intake");
    invalidateIntakeCache();
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to permanently delete intake transaction" };
  }
}
