/**
 * Canonical product validation helper to verify if a product
 * has all required unit configuration fields populated.
 *
 * @param {object} product - The product object to validate
 * @returns {{isValid: boolean, errors: string[]}}
 */
export function getProductValidationState(product) {
  const errors = [];
  if (!product) {
    return { isValid: false, errors: ["Product is undefined"] };
  }
  if (!product.primaryUnit) {
    errors.push("primaryUnit");
  }
  if (!product.defaultSellingUnit) {
    errors.push("defaultSellingUnit");
  }
  if (!product.buyingRateUnit) {
    errors.push("buyingRateUnit");
  }
  if (!product.sellingRateUnit) {
    errors.push("sellingRateUnit");
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Quick helper to check if a product is fully operational.
 *
 * @param {object} product - The product object to validate
 * @returns {boolean}
 */
export function isProductOperational(product) {
  return getProductValidationState(product).isValid;
}
