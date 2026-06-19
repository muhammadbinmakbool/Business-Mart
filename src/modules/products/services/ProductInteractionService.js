"use server";

import { cache } from "react";
import { ProductRepository } from "../repositories/ProductRepository";
import { resolveProductDefaults } from "../utils/productDefaults";
import { getProductValidationState } from "../utils/productValidation";

// Memoized repository fetch within a request lifecycle
const fetchProductCached = cache(async (productId) => {
  if (!productId) return null;
  const product = await ProductRepository.getById(Number(productId));
  return product ? JSON.parse(JSON.stringify(product)) : null;
});

/**
 * Resolves product defaults for the Intake workflow.
 */
export async function getProductForIntake(productId, sessionMemory = {}) {
  try {
    const product = await fetchProductCached(productId);
    if (!product) return { success: false, error: "Product not found" };

    const validation = getProductValidationState(product);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Cannot select product: "${product.name}" configuration is invalid. Missing: ${validation.errors.join(", ")}`
      };
    }

    const defaults = resolveProductDefaults(product, sessionMemory, "intake");
    return {
      success: true,
      product,
      defaults
    };
  } catch (error) {
    return { success: false, error: error.message || "Failed to resolve intake defaults" };
  }
}

/**
 * Resolves product defaults for the Classic Sale workflow.
 */
export async function getProductForSale(productId, sessionMemory = {}) {
  try {
    const product = await fetchProductCached(productId);
    if (!product) return { success: false, error: "Product not found" };

    const validation = getProductValidationState(product);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Cannot select product: "${product.name}" configuration is invalid. Missing: ${validation.errors.join(", ")}`
      };
    }

    const defaults = resolveProductDefaults(product, sessionMemory, "sale");
    return {
      success: true,
      product,
      defaults
    };
  } catch (error) {
    return { success: false, error: error.message || "Failed to resolve sale defaults" };
  }
}

/**
 * Resolves product defaults for the POS workflow.
 */
export async function getProductForPOS(productId, sessionMemory = {}) {
  try {
    const product = await fetchProductCached(productId);
    if (!product) return { success: false, error: "Product not found" };

    const validation = getProductValidationState(product);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Cannot select product: "${product.name}" configuration is invalid. Missing: ${validation.errors.join(", ")}`
      };
    }

    const defaults = resolveProductDefaults(product, sessionMemory, "sale");
    return {
      success: true,
      product,
      defaults
    };
  } catch (error) {
    return { success: false, error: error.message || "Failed to resolve POS defaults" };
  }
}
