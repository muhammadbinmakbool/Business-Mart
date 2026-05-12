"use server";

import { ProductService } from "../services/ProductService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProductAction(formData) {
  const data = {
    name: formData.get("name"),
    unitType: formData.get("unitType"),
    isActive: true,
  };

  try {
    await ProductService.createProduct(data);
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to create product" };
  }
}

export async function updateProductAction(id, formData) {
  const data = {
    name: formData.get("name"),
    unitType: formData.get("unitType"),
    isActive: formData.get("isActive") === "true",
  };

  try {
    await ProductService.updateProduct(id, data);
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to update product" };
  }
}

export async function toggleProductStatusAction(id, isActive) {
  try {
    await ProductService.toggleProductStatus(id, isActive);
    revalidatePath("/products");
  } catch (error) {
    return { error: "Failed to toggle status" };
  }
}
