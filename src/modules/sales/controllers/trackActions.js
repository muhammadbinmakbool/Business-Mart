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

export async function deleteTrackAction(id, confirmPassword, deleteReason) {
  try {
    // Enforce unified record deletion permission and password confirmation check
    await assertDeletePermission(confirmPassword);

    let deletedBy = null;
    try {
      const { getSession } = await import("@/lib/session");
      const session = await getSession();
      if (session) deletedBy = session.userId;
    } catch (e) {}

    await SalesTrackService.delete(id, { deletedBy, deleteReason });
    revalidatePath("/source-tracking");
    return { success: true };
  } catch (error) {
    console.error("Error deleting track entry:", error);
    return { success: false, error: error.message };
  }
}

export async function hardDeleteTrackAction(id, deleteReason) {
  try {
    // assertDestructiveMode is called inside SalesTrackService.hardDelete
    await SalesTrackService.hardDelete(id, deleteReason);
    revalidatePath("/source-tracking");
    return { success: true };
  } catch (error) {
    console.error("Error permanently deleting track entry:", error);
    return { success: false, error: error.message };
  }
}

export async function getUnbilledTracksAction(buyerPartyId) {
  try {
    const tracks = await SalesTrackService.listUnbilledByBuyer(buyerPartyId);
    return { success: true, data: JSON.parse(JSON.stringify(tracks)) };
  } catch (error) {
    console.error("Error fetching unbilled tracks:", error);
    return { success: false, error: error.message };
  }
}
