import prisma from "@/lib/prisma";

export class UnitRepository {
  // --- Unit Categories ---
  static async findAllCategories() {
    return prisma.unitCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { units: true }
        }
      }
    });
  }

  static async findCategoryById(id) {
    if (!id) return null;
    return prisma.unitCategory.findUnique({
      where: { id: Number(id) }
    });
  }

  static async findCategoryByCode(code) {
    if (!code) return null;
    return prisma.unitCategory.findUnique({
      where: { code: code.toUpperCase().trim() }
    });
  }

  static async createCategory(data) {
    return prisma.unitCategory.create({
      data: {
        name: data.name.trim(),
        code: data.code.toUpperCase().trim(),
        isActive: data.isActive !== false
      }
    });
  }

  static async updateCategory(id, data) {
    return prisma.unitCategory.update({
      where: { id: Number(id) },
      data: {
        name: data.name ? data.name.trim() : undefined,
        code: data.code ? data.code.toUpperCase().trim() : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined
      }
    });
  }

  static async deleteCategory(id) {
    return prisma.unitCategory.delete({
      where: { id: Number(id) }
    });
  }

  // --- Units ---
  static async findAllUnits() {
    return prisma.unit.findMany({
      orderBy: { name: "asc" },
      include: {
        unitCategory: true
      }
    });
  }

  static async findUnitById(id) {
    if (!id) return null;
    return prisma.unit.findUnique({
      where: { id: Number(id) },
      include: {
        unitCategory: true
      }
    });
  }

  static async findUnitByCode(code) {
    if (!code) return null;
    return prisma.unit.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: {
        unitCategory: true
      }
    });
  }

  static async findUnitsByCategory(unitCategoryId) {
    return prisma.unit.findMany({
      where: { unitCategoryId: Number(unitCategoryId) },
      orderBy: { name: "asc" }
    });
  }

  static async findUnitsByCategoryCode(categoryCode) {
    return prisma.unit.findMany({
      where: {
        unitCategory: {
          code: categoryCode.toUpperCase().trim()
        }
      },
      orderBy: { name: "asc" }
    });
  }

  static async createUnit(data) {
    return prisma.unit.create({
      data: {
        name: data.name.trim(),
        code: data.code.toUpperCase().trim(),
        unitCategoryId: Number(data.unitCategoryId),
        isBase: data.isBase === true,
        isCustom: data.isCustom === true,
        conversionRate: data.conversionRate ? Number(data.conversionRate) : null,
        isActive: data.isActive !== false
      }
    });
  }

  static async updateUnit(id, data) {
    return prisma.unit.update({
      where: { id: Number(id) },
      data: {
        name: data.name ? data.name.trim() : undefined,
        code: data.code ? data.code.toUpperCase().trim() : undefined,
        unitCategoryId: data.unitCategoryId ? Number(data.unitCategoryId) : undefined,
        isBase: data.isBase !== undefined ? data.isBase === true : undefined,
        isCustom: data.isCustom !== undefined ? data.isCustom === true : undefined,
        conversionRate: data.conversionRate !== undefined ? (data.conversionRate ? Number(data.conversionRate) : null) : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined
      }
    });
  }

  static async deleteUnit(id) {
    return prisma.unit.delete({
      where: { id: Number(id) }
    });
  }

  static async clearBaseFlagsForCategory(unitCategoryId) {
    return prisma.unit.updateMany({
      where: { unitCategoryId: Number(unitCategoryId) },
      data: { isBase: false }
    });
  }

  static async countProductsWithUnit(unitCode) {
    return prisma.product.count({
      where: {
        OR: [
          { primaryUnit: unitCode },
          { buyingRateUnit: unitCode },
          { sellingRateUnit: unitCode },
          { defaultSellingUnit: unitCode }
        ],
        isDeleted: false
      }
    });
  }

  static async countProductsWithCategory(categoryCode) {
    return prisma.product.count({
      where: {
        unitCategory: categoryCode,
        isDeleted: false
      }
    });
  }
}
