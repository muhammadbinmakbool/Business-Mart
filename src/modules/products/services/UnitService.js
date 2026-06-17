import { UnitRepository } from "../repositories/UnitRepository";

// Request-scoped / Process-level in-memory read-through cache
let globalRegistryCache = null;
let globalRegistryTimestamp = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

export class UnitService {
  static async getUnitRegistry() {
    const now = Date.now();
    if (globalRegistryCache && (now - globalRegistryTimestamp < CACHE_TTL_MS)) {
      return globalRegistryCache;
    }

    const categories = await UnitRepository.findAllCategories();
    const units = await UnitRepository.findAllUnits();

    const activeCategories = categories.filter(c => c.isActive);
    const activeUnits = units.filter(u => u.isActive);

    const registry = {
      categories: {},
      units: {},
      baseUnits: {}
    };

    for (const cat of activeCategories) {
      registry.categories[cat.code] = {
        id: cat.id,
        name: cat.name,
        code: cat.code
      };
    }

    for (const u of activeUnits) {
      registry.units[u.code] = {
        id: u.id,
        name: u.name,
        code: u.code,
        unitCategoryCode: u.unitCategory.code,
        isBase: u.isBase,
        isCustom: u.isCustom,
        conversionRate: u.conversionRate ? Number(u.conversionRate) : null
      };

      if (u.isBase) {
        registry.baseUnits[u.unitCategory.code] = u.code;
      }
    }

    globalRegistryCache = registry;
    globalRegistryTimestamp = now;
    return registry;
  }

  static invalidateCache() {
    globalRegistryCache = null;
    globalRegistryTimestamp = 0;
  }

  // --- Core Domain Validation ---
  static async isValidUnitForCategory(unitCode, categoryCode) {
    if (!unitCode || !categoryCode) return false;
    const registry = await this.getUnitRegistry();
    const unit = registry.units[unitCode.toUpperCase().trim()];
    return unit?.unitCategoryCode.toUpperCase() === categoryCode.toUpperCase().trim();
  }

  // --- Dynamic Conversions ---
  static async getConversionFactor(unitCode, product) {
    if (!unitCode) return 1.0;
    const registry = await this.getUnitRegistry();
    const unit = registry.units[unitCode.toUpperCase().trim()];
    if (!unit) return 1.0;

    if (unit.isCustom) {
      const factor = Number(product?.unitConversion);
      if (!factor || factor <= 0) {
        throw new Error(
          `MISSING_CONVERSION: Unit ${unitCode} is custom but no conversion factor is defined for product "${product?.name || 'Unknown'}"`
        );
      }
      return factor;
    }

    return unit.conversionRate !== null ? Number(unit.conversionRate) : 1.0;
  }

  static async getNormalizedQuantity(value, unitCode, product) {
    if (value == null) return 0;
    const factor = await this.getConversionFactor(unitCode, product);
    return Number(value) * factor;
  }

  static async getNormalizedRate(rate, unitCode, product) {
    if (rate == null) return 0;
    const factor = await this.getConversionFactor(unitCode, product);
    return Number(rate) / factor;
  }

  static async getDisplayQuantity(normalizedValue, targetUnitCode, product) {
    if (normalizedValue == null) return 0;
    const factor = await this.getConversionFactor(targetUnitCode, product);
    return factor > 0 ? (Number(normalizedValue) / factor) : Number(normalizedValue);
  }

  static async getBaseUnit(categoryCode) {
    if (!categoryCode) return "KG";
    const registry = await this.getUnitRegistry();
    return registry.baseUnits[categoryCode.toUpperCase().trim()] || "KG";
  }

  // --- CRUD Services ---
  static async listCategories() {
    return UnitRepository.findAllCategories();
  }

  static async listUnits() {
    return UnitRepository.findAllUnits();
  }

  static async createCategory(data) {
    const res = await UnitRepository.createCategory(data);
    this.invalidateCache();
    return res;
  }

  static async updateCategory(id, data) {
    const res = await UnitRepository.updateCategory(id, data);
    this.invalidateCache();
    return res;
  }

  static async deleteCategory(id) {
    const existing = await UnitRepository.findCategoryById(id);
    if (!existing) throw new Error("Category not found");

    const units = await UnitRepository.findUnitsByCategory(id);
    if (units.length > 0) {
      throw new Error("Cannot delete category with associated units.");
    }

    const usageCount = await UnitRepository.countProductsWithCategory(existing.code);
    if (usageCount > 0) {
      throw new Error(`Cannot delete category ${existing.code} because it is referenced by active products.`);
    }

    const res = await UnitRepository.deleteCategory(id);
    this.invalidateCache();
    return res;
  }

  static async createUnit(data) {
    if (data.isBase) {
      await UnitRepository.clearBaseFlagsForCategory(data.unitCategoryId);
    }
    const res = await UnitRepository.createUnit(data);
    this.invalidateCache();
    return res;
  }

  static async updateUnit(id, data) {
    const existing = await UnitRepository.findUnitById(id);
    if (!existing) throw new Error("Unit not found");

    if (data.isBase) {
      const catId = data.unitCategoryId || existing.unitCategoryId;
      await UnitRepository.clearBaseFlagsForCategory(catId);
    }

    const res = await UnitRepository.updateUnit(id, data);
    this.invalidateCache();
    return res;
  }

  static async deleteUnit(id) {
    const existing = await UnitRepository.findUnitById(id);
    if (!existing) throw new Error("Unit not found");

    const usageCount = await UnitRepository.countProductsWithUnit(existing.code);
    if (usageCount > 0) {
      throw new Error(`Cannot delete unit ${existing.code} because it is referenced by active products.`);
    }

    const res = await UnitRepository.deleteUnit(id);
    this.invalidateCache();
    return res;
  }
}
