"use server";

import { UnitService } from "../services/UnitService";
import { revalidatePath } from "next/cache";

// --- Unit Category Actions ---
export async function createUnitCategoryAction(data) {
  try {
    const category = await UnitService.createCategory(data);
    revalidatePath("/settings/unit-categories");
    revalidatePath("/settings/units");
    revalidatePath("/settings");
    return { success: true, data: JSON.parse(JSON.stringify(category)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to create unit category" };
  }
}

export async function updateUnitCategoryAction(id, data) {
  try {
    const category = await UnitService.updateCategory(id, data);
    revalidatePath("/settings/unit-categories");
    revalidatePath("/settings/units");
    revalidatePath("/settings");
    return { success: true, data: JSON.parse(JSON.stringify(category)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to update unit category" };
  }
}

export async function deleteUnitCategoryAction(id) {
  try {
    const category = await UnitService.deleteCategory(id);
    revalidatePath("/settings/unit-categories");
    revalidatePath("/settings/units");
    revalidatePath("/settings");
    return { success: true, data: JSON.parse(JSON.stringify(category)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to delete unit category" };
  }
}

export async function getUnitCategoriesAction() {
  try {
    const categories = await UnitService.listCategories();
    return { success: true, data: JSON.parse(JSON.stringify(categories)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to fetch unit categories" };
  }
}

// --- Unit Actions ---
export async function createUnitAction(data) {
  try {
    const unit = await UnitService.createUnit(data);
    revalidatePath("/settings/units");
    revalidatePath("/settings");
    return { success: true, data: JSON.parse(JSON.stringify(unit)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to create unit" };
  }
}

export async function updateUnitAction(id, data) {
  try {
    const unit = await UnitService.updateUnit(id, data);
    revalidatePath("/settings/units");
    revalidatePath("/settings");
    return { success: true, data: JSON.parse(JSON.stringify(unit)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to update unit" };
  }
}

export async function deleteUnitAction(id) {
  try {
    const unit = await UnitService.deleteUnit(id);
    revalidatePath("/settings/units");
    revalidatePath("/settings");
    return { success: true, data: JSON.parse(JSON.stringify(unit)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to delete unit" };
  }
}

export async function getUnitsAction() {
  try {
    const units = await UnitService.listUnits();
    return { success: true, data: JSON.parse(JSON.stringify(units)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to fetch units" };
  }
}

export async function getUnitRegistryAction() {
  try {
    const registry = await UnitService.getUnitRegistry();
    return { success: true, data: JSON.parse(JSON.stringify(registry)) };
  } catch (error) {
    return { success: false, error: error.message || "Failed to fetch unit registry" };
  }
}
