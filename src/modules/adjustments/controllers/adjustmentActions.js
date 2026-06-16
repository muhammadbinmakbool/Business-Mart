"use server";

import { AdjustmentService } from "../services/AdjustmentService";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function assertSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    throw new Error("Forbidden: You must be a Super Admin to perform this action.");
  }
}

export async function createAdjustmentAction(data) {
  try {
    await assertSuperAdmin();
    const created = await AdjustmentService.createAdjustment(data);
    revalidatePath("/adjustments");
    return { success: true, adjustment: created };
  } catch (error) {
    return { success: false, error: error.message || "Failed to create adjustment definition" };
  }
}

export async function updateAdjustmentAction(id, data) {
  try {
    await assertSuperAdmin();
    const updated = await AdjustmentService.updateAdjustment(id, data);
    revalidatePath("/adjustments");
    return { success: true, adjustment: updated };
  } catch (error) {
    return { success: false, error: error.message || "Failed to update adjustment definition" };
  }
}

export async function toggleAdjustmentStatusAction(id, isActive) {
  try {
    await assertSuperAdmin();
    const updated = await AdjustmentService.toggleAdjustmentStatus(id, isActive);
    revalidatePath("/adjustments");
    return { success: true, adjustment: updated };
  } catch (error) {
    return { success: false, error: error.message || "Failed to toggle adjustment status" };
  }
}

export async function deleteAdjustmentAction(id) {
  try {
    await assertSuperAdmin();
    await AdjustmentService.deleteAdjustment(id);
    revalidatePath("/adjustments");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message || "Failed to delete adjustment definition" };
  }
}

export async function getActiveAdjustmentsAction() {
  try {
    const adjustments = await AdjustmentService.listActiveAdjustments();
    return { success: true, adjustments };
  } catch (error) {
    return { success: false, error: error.message || "Failed to load active adjustments" };
  }
}

export async function listAdjustmentsAction(params) {
  try {
    const res = await AdjustmentService.listAdjustmentsPaginated(params);
    return { success: true, ...res };
  } catch (error) {
    return { success: false, error: error.message || "Failed to list adjustments" };
  }
}
