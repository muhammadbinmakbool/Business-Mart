"use server";

import { revalidatePath } from "next/cache";
import { SaleService } from "../services/SaleService";

export async function createSaleAction(data) {
  try {
    const sale = await SaleService.recordSale(data);
    revalidatePath("/sales");
    return { success: true, data: JSON.parse(JSON.stringify(sale)) };
  } catch (error) {
    console.error("Failed to record sale:", error);
    return { success: false, error: error.message };
  }
}

export async function listSalesAction() {
  try {
    const sales = await SaleService.listSales();
    return { success: true, data: sales };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getSaleAction(id) {
  try {
    const sale = await SaleService.getSale(id);
    return { success: true, data: sale };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateSaleAction(id, data) {
  try {
    const sale = await SaleService.updateSale(id, data);
    revalidatePath(`/sales/${id}`);
    revalidatePath("/sales");
    return { success: true, data: JSON.parse(JSON.stringify(sale)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deleteSaleAction(id) {
  try {
    await SaleService.deleteSale(id);
    revalidatePath("/sales");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateSaleStatusAction(id, status) {
  try {
    const sale = await SaleService.updateStatus(id, status);
    revalidatePath(`/sales/${id}`);
    revalidatePath("/sales");
    return { success: true, data: JSON.parse(JSON.stringify(sale)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function revertSaleStatusAction(id) {
  try {
    const sale = await SaleService.updateStatus(id, "PENDING");
    revalidatePath(`/sales/${id}`);
    revalidatePath("/sales");
    return { success: true, data: JSON.parse(JSON.stringify(sale)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getAvailableStockAction(productId) {
  try {
    const stock = await SaleService.getAvailableStock(productId);
    return { success: true, data: stock };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function recordSalePaymentAction(id, amount) {
  try {
    const sale = await SaleService.recordPayment(id, amount);
    revalidatePath(`/sales/${id}`);
    revalidatePath("/sales");
    return { success: true, data: JSON.parse(JSON.stringify(sale)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

