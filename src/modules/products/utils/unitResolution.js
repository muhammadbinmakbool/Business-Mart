/**
 * Layer 1: Pure Product Defaults
 * Retrieves the configuration defaults directly from the product object.
 *
 * @param {object} product - The product object
 * @returns {{primaryUnit: string|null, defaultSellingUnit: string|null, buyingRateUnit: string|null, sellingRateUnit: string|null}}
 */
export function getProductDefaultUnits(product) {
  return {
    primaryUnit: product?.primaryUnit ?? null,
    defaultSellingUnit: product?.defaultSellingUnit ?? null,
    buyingRateUnit: product?.buyingRateUnit ?? null,
    sellingRateUnit: product?.sellingRateUnit ?? null
  };
}

/**
 * Layer 2: Sale Item Snapshot Resolver
 * Resolves the unit and rate unit for a sale item, prioritizing stored values
 * on the item snapshot before falling back to product-defined defaults.
 *
 * @param {object} item - The sale item or form item state
 * @param {object} product - The resolved product object
 * @returns {{unit: string|null, rateUnit: string|null}}
 */
export function resolveSaleItemUnitSnapshot(item, product) {
  return {
    unit: item?.unit ?? product?.defaultSellingUnit ?? product?.primaryUnit ?? null,
    rateUnit: item?.rateUnit ?? product?.sellingRateUnit ?? null
  };
}

/**
 * Layer 2: Intake Transaction Snapshot Resolver
 * Resolves the unit and rate unit for an intake transaction, prioritizing stored
 * values on the intake snapshot before falling back to product-defined defaults.
 *
 * @param {object} intake - The intake transaction or form intake state
 * @param {object} product - The resolved product object
 * @returns {{unit: string|null, rateUnit: string|null, khotRateUnit: string|null}}
 */
export function resolveIntakeUnitSnapshot(intake, product) {
  return {
    unit: intake?.unit ?? product?.primaryUnit ?? null,
    rateUnit: intake?.rateUnit ?? product?.buyingRateUnit ?? null,
    khotRateUnit: intake?.khotRateUnit ?? product?.primaryUnit ?? null
  };
}
