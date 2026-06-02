"use server";

import { ProductService } from "../services/ProductService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProductAction(formData) {
  const data = {
    name: formData.get("name"),
    category: formData.get("category"),
    primaryUnit: formData.get("primaryUnit"),
    unitConversion: formData.get("unitConversion") ? formData.get("unitConversion") : null,
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
    category: formData.get("category"),
    primaryUnit: formData.get("primaryUnit"),
    unitConversion: formData.get("unitConversion") ? formData.get("unitConversion") : null,
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

import { assertDeletePermission } from "@/lib/authGuard";

export async function toggleProductStatusAction(id, isActive) {
  try {
    await ProductService.toggleProductStatus(id, isActive);
    revalidatePath("/products");
  } catch (error) {
    return { error: "Failed to toggle status" };
  }
}
export async function deleteProductAction(id, confirmPassword) {
  try {
    // Enforce unified record deletion permission and password confirmation check
    await assertDeletePermission(confirmPassword);

    await ProductService.deleteProduct(id);
    revalidatePath("/products");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to delete product" };
  }
}

export async function getActiveProductsAction() {
  try {
    const products = await ProductService.listProducts();
    return { success: true, products: products.filter(p => p.isActive) };
  } catch (error) {
    console.error("Failed to fetch active products:", error);
    return { success: false, error: error.message || "Failed to load products" };
  }
}

