"use server";

import { ProductService } from "../services/ProductService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invalidateCacheBucket } from "@/modules/aggregations/cache";
import { getProductValidationState } from "../utils/productValidation";
import { ApplicationLogger } from "@/lib/logger";

export async function createProductAction(formData) {
  const data = {
    name: formData.get("name"),
    unitCategory: formData.get("unitCategory") || "WEIGHT",
    productCategoryId: formData.get("productCategoryId") ? Number(formData.get("productCategoryId")) : null,
    primaryUnit: formData.get("primaryUnit"),
    unitConversion: formData.get("unitConversion") ? Number(formData.get("unitConversion")) : null,
    defaultBuyingRate: formData.get("defaultBuyingRate") ? Number(formData.get("defaultBuyingRate")) : null,
    defaultSellingRate: formData.get("defaultSellingRate") ? Number(formData.get("defaultSellingRate")) : null,
    buyingRateUnit: formData.get("buyingRateUnit") || null,
    sellingRateUnit: formData.get("sellingRateUnit") || null,
    defaultSellingUnit: formData.get("defaultSellingUnit") || null,
    displayOrder: formData.get("displayOrder") ? Number(formData.get("displayOrder")) : 0,
    isActive: true,
  };

  const validation = getProductValidationState(data);
  if (!validation.isValid) {
    return { error: `Product configuration is invalid. Missing required fields: ${validation.errors.join(", ")}` };
  }

  try {
    await ProductService.createProduct(data);
    revalidatePath("/products");
    invalidateCacheBucket("dashboard");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to create product" };
  }
}

export async function updateProductAction(id, formData) {
  const data = {
    name: formData.get("name"),
    unitCategory: formData.get("unitCategory") || "WEIGHT",
    productCategoryId: formData.get("productCategoryId") ? Number(formData.get("productCategoryId")) : null,
    primaryUnit: formData.get("primaryUnit"),
    unitConversion: formData.get("unitConversion") ? Number(formData.get("unitConversion")) : null,
    defaultBuyingRate: formData.get("defaultBuyingRate") ? Number(formData.get("defaultBuyingRate")) : null,
    defaultSellingRate: formData.get("defaultSellingRate") ? Number(formData.get("defaultSellingRate")) : null,
    buyingRateUnit: formData.get("buyingRateUnit") || null,
    sellingRateUnit: formData.get("sellingRateUnit") || null,
    defaultSellingUnit: formData.get("defaultSellingUnit") || null,
    displayOrder: formData.get("displayOrder") ? Number(formData.get("displayOrder")) : 0,
    isActive: formData.get("isActive") === "true",
  };

  const validation = getProductValidationState(data);
  if (!validation.isValid) {
    return { error: `Product configuration is invalid. Missing required fields: ${validation.errors.join(", ")}` };
  }

  try {
    await ProductService.updateProduct(id, data);
    revalidatePath("/products");
    invalidateCacheBucket("dashboard");
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
    invalidateCacheBucket("dashboard");
  } catch (error) {
    return { error: "Failed to toggle status" };
  }
}
export async function deleteProductAction(id, confirmPassword, deleteReason) {
  try {
    // Enforce unified record deletion permission and password confirmation check
    await assertDeletePermission(confirmPassword);

    await ProductService.deleteProduct(id, deleteReason);
    revalidatePath("/products");
    invalidateCacheBucket("dashboard");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to delete product" };
  }
}

export async function hardDeleteProductAction(id, deleteReason) {
  try {
    // assertDestructiveMode is called inside ProductRepository.hardDelete
    await ProductService.hardDeleteProduct(id, deleteReason);
    revalidatePath("/products");
    invalidateCacheBucket("dashboard");
    return { success: true };
  } catch (error) {
    return { error: error.message || "Failed to permanently delete product" };
  }
}

export async function getActiveProductsAction() {
  try {
    const products = await ProductService.listProducts();
    return { success: true, products: products.filter(p => p.isActive) };
  } catch (error) {
    ApplicationLogger.error("Failed to fetch active products", error);
    return { success: false, error: error.message || "Failed to load products" };
  }
}

