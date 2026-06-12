"use server";

import { AdvanceService } from "../services/AdvanceService";
import { revalidatePath } from "next/cache";
import { invalidateCacheBucket } from "@/modules/aggregations/cache";

export async function recordAdvanceAction(formData) {
  const data = {
    partyId: formData.get("partyId"),
    intakeTransactionId: formData.get("intakeTransactionId") || null,
    amount: formData.get("amount"),
    notes: formData.get("notes") || "",
  };

  try {
    await AdvanceService.recordAdvance(data);
    revalidatePath("/intake"); // To update any linked advance lists
    invalidateCacheBucket("dashboard");
    invalidateCacheBucket("supplier");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to record advance payment" };
  }
}
