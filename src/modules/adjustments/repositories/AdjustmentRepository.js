import { prisma } from "@/lib/prisma";

export class AdjustmentRepository {
  static serializeAdjustment(adj) {
    if (!adj) return null;
    return {
      ...adj,
      defaultConfiguredValue: adj.defaultConfiguredValue ? Number(adj.defaultConfiguredValue) : null
    };
  }

  static async getAll() {
    const adjustments = await prisma.adjustmentDefinition.findMany({
      where: { isDeleted: false },
      orderBy: { displayOrder: "asc" }
    });
    return adjustments.map(a => this.serializeAdjustment(a));
  }

  static async getActive() {
    const adjustments = await prisma.adjustmentDefinition.findMany({
      where: { isDeleted: false, isActive: true },
      orderBy: { displayOrder: "asc" }
    });
    return adjustments.map(a => this.serializeAdjustment(a));
  }

  static async getById(id) {
    const adj = await prisma.adjustmentDefinition.findFirst({
      where: { id: parseInt(id), isDeleted: false }
    });
    return this.serializeAdjustment(adj);
  }

  static async getByCode(code) {
    const adj = await prisma.adjustmentDefinition.findFirst({
      where: { code, isDeleted: false }
    });
    return this.serializeAdjustment(adj);
  }

  static async getAllPaginated({
    page = 1,
    limit = 50,
    searchQuery = "",
    applicableTo = "ALL",
    sortField = "displayOrder",
    sortDirection = "asc"
  } = {}) {
    const where = { isDeleted: false };

    if (searchQuery) {
      const q = searchQuery.trim();
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q } }
      ];
    }

    if (applicableTo && applicableTo !== "ALL") {
      where.applicableTo = applicableTo;
    }

    const skip = (page - 1) * limit;
    const direction = sortDirection === "desc" ? "desc" : "asc";

    const [items, totalCount] = await Promise.all([
      prisma.adjustmentDefinition.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: direction }
      }),
      prisma.adjustmentDefinition.count({ where })
    ]);

    return {
      items: items.map(a => this.serializeAdjustment(a)),
      totalCount
    };
  }

  static async create(data) {
    const created = await prisma.adjustmentDefinition.create({
      data
    });
    return this.serializeAdjustment(created);
  }

  static async update(id, data) {
    const updated = await prisma.adjustmentDefinition.update({
      where: { id: parseInt(id) },
      data
    });
    return this.serializeAdjustment(updated);
  }

  static async softDelete(id) {
    const deleted = await prisma.adjustmentDefinition.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true }
    });
    return this.serializeAdjustment(deleted);
  }

  static async toggleStatus(id, isActive) {
    const updated = await prisma.adjustmentDefinition.update({
      where: { id: parseInt(id) },
      data: { isActive }
    });
    return this.serializeAdjustment(updated);
  }
}
