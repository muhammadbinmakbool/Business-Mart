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

export async function deleteTrackAction(id) {
  try {
    await SalesTrackService.delete(id);
    revalidatePath("/source-tracking");
    return { success: true };
  } catch (error) {
    console.error("Error deleting track entry:", error);
    return { success: false, error: error.message };
  }
}
