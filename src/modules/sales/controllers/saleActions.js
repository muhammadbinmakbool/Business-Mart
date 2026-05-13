"use server";

import { SaleService } from "../services/SaleService";
import { revalidatePath } from "next/cache";

export async function createSaleAction(data) {
  try {
    const sale = await SaleService.createSale(data);
    revalidatePath("/sales");
    return { success: true, id: sale.id };
  } catch (error) {
    console.error("Sale creation error:", error);
    return { error: error.message || "Failed to create sale invoice" };
  }
}

export async function deleteSaleAction(id) {
  try {
    await SaleService.deleteSale(id);
    revalidatePath("/sales");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to delete sale" };
  }
}

export async function updateSaleStatusAction(id, status) {
  try {
    await SaleService.updateStatus(id, status);
    revalidatePath("/sales");
    revalidatePath(`/sales/${id}`);
    return { success: true };
  } catch (error) {
    return { error: "Failed to update status" };
  }
}
