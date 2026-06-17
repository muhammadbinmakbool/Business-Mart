"use server";

import { ProductCategoryService } from "../services/ProductCategoryService";
import { revalidatePath } from "next/cache";

export async function createCategoryAction(data) {
  try {
    const category = await ProductCategoryService.createCategory(data);
    revalidatePath("/product-categories");
    revalidatePath("/products");
    return { success: true, data: JSON.parse(JSON.stringify(category)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to create category" };
  }
}

export async function updateCategoryAction(id, data) {
  try {
    const category = await ProductCategoryService.updateCategory(id, data);
    revalidatePath("/product-categories");
    revalidatePath("/products");
    return { success: true, data: JSON.parse(JSON.stringify(category)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to update category" };
  }
}

export async function deleteCategoryAction(id) {
  try {
    const result = await ProductCategoryService.deleteCategory(id);
    revalidatePath("/product-categories");
    revalidatePath("/products");
    return result;
  } catch (error) {
    return { success: false, error: error.message || "Failed to delete category" };
  }
}

export async function getCategoriesAction() {
  try {
    const categories = await ProductCategoryService.listCategories();
    return { success: true, data: JSON.parse(JSON.stringify(categories)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to fetch categories" };
  }
}
