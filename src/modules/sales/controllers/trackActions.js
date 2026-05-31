"use server";

import { SalesTrackService } from "../services/SalesTrackService";
import { revalidatePath } from "next/cache";

export async function createTrackAction(data) {
  try {
    await SalesTrackService.create(data);
    revalidatePath("/source-tracking");
    return { success: true };
  } catch (error) {
    console.error("Error creating track entry:", error);
    return { success: false, error: error.message };
  }
}

export async function updateTrackAction(id, data) {
  try {
    await SalesTrackService.update(id, data);
    revalidatePath("/source-tracking");
    return { success: true };
  } catch (error) {
    console.error("Error updating track entry:", error);
    return { success: false, error: error.message };
  }
}

import { assertDeletePermission } from "@/lib/authGuard";

export async function deleteTrackAction(id, confirmPassword) {
  try {
    // Enforce unified record deletion permission and password confirmation check
    await assertDeletePermission(confirmPassword);

    await SalesTrackService.delete(id);
    revalidatePath("/source-tracking");
    return { success: true };
  } catch (error) {
    console.error("Error deleting track entry:", error);
    return { success: false, error: error.message };
  }
}

export async function getUnbilledTracksAction(buyerPartyId) {
  try {
    const tracks = await SalesTrackService.listUnbilledByBuyer(buyerPartyId);
    return { success: true, data: tracks };
  } catch (error) {
    console.error("Error fetching unbilled tracks:", error);
    return { success: false, error: error.message };
  }
}
