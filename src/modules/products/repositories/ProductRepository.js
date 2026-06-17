import { prisma } from "@/lib/prisma";
import { assertDestructiveMode } from "@/lib/destructiveSession";

export class ProductRepository {
  static serializeProduct(p) {
    if (!p) return null;
    const serialized = {
      ...p,
      quantity: p.quantity ? Number(p.quantity) : 0,
      unitConversion: p.unitConversion ? Number(p.unitConversion) : null,
      defaultBuyingRate: p.defaultBuyingRate ? Number(p.defaultBuyingRate) : null,
      defaultSellingRate: p.defaultSellingRate ? Number(p.defaultSellingRate) : null
    };
    if (p.initialStock) {
      serialized.initialStock = {
        ...p.initialStock,
        quantity: p.initialStock.quantity ? Number(p.initialStock.quantity) : 0
      };
    }
    return serialized;
  }

  static async getAll() {
    const products = await prisma.product.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
      include: { productCategory: true }
    });
    return products.map(p => this.serializeProduct(p));
  }

  static async getAllWithStock() {
    const products = await prisma.product.findMany({
      where: { isDeleted: false },
      orderBy: [
        { name: "asc" },
        { id: "desc" }
      ],
      include: { productCategory: true }
    });

    return products.map(p => {
      const serialized = this.serializeProduct(p);
      return {
        ...serialized,
        availableStock: serialized.quantity
      };
    });
  }

  static async getAllPaginated({
    page = 1,
    limit = 50,
    searchQuery = "",
    sortField = "name",
    sortDirection = "asc"
  } = {}) {
    let showDeleted = false;
    try {
      const { getActivityAuditSettings } = await import("@/lib/settings/activityAuditSettings");
      const settings = await getActivityAuditSettings();
      showDeleted = settings.showDeletedRecords;
    } catch (e) {}

    const where = showDeleted ? {} : { isDeleted: false };

    if (searchQuery) {
      const q = searchQuery.trim();
      where.OR = [
        { name: { contains: q } },
        { category: { contains: q } }
      ];
    }

    const skip = (page - 1) * limit;

    const orderByClause = [];
    if (sortField) {
      const direction = sortDirection === "asc" ? "asc" : "desc";
      orderByClause.push({ [sortField]: direction });
    } else {
      orderByClause.push({ name: "asc" });
    }
    orderByClause.push({ id: "desc" });

    const [items, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderByClause,
        include: { productCategory: true }
      }),
      prisma.product.count({ where })
    ]);

    const mappedItems = items.map(p => {
      const serialized = this.serializeProduct(p);
      return {
        ...serialized,
        availableStock: serialized.quantity
      };
    });

    return { items: mappedItems, totalCount };
  }


  static async getById(id) {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id), isDeleted: false },
      include: { initialStock: true, productCategory: true }
    });
    return this.serializeProduct(product);
  }

  static async create(data) {
    const p = await prisma.product.create({
      data,
    });
    return this.serializeProduct(p);
  }

  static async update(id, data) {
    const p = await prisma.product.update({
      where: { id: parseInt(id) },
      data,
    });
    return this.serializeProduct(p);
  }

  static async toggleStatus(id, isActive) {
    const p = await prisma.product.update({
      where: { id: parseInt(id) },
      data: { isActive },
    });
    return this.serializeProduct(p);
  }

  /**
   * Soft deletes a product by marking it as deleted.
   * @param {number} id
   * @param {{ deletedBy?: number, deleteReason?: string }} [opts]
   */
  static async softDelete(id, { deletedBy, deleteReason } = {}) {
    const p = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: deletedBy || null,
        deleteReason: deleteReason || null,
      },
    });
    return this.serializeProduct(p);
  }

  /**
   * HARD DELETE — permanently removes the product from the database.
   * Requires an active Destructive Mode session.
   * Preserves original constraint checks to prevent accidental deletion of linked products.
   * @param {number} id
   * @param {string} [deleteReason]
   */
  static async hardDelete(id, deleteReason) {
    await assertDestructiveMode();
    const pId = parseInt(id);

    // 1. Check Intake transactions
    const intakesCount = await prisma.intakeTransaction.count({
      where: { productId: pId }
    });
    if (intakesCount > 0) {
      throw new Error("Cannot hard delete product because it has associated intake transactions. Use soft delete instead.");
    }

    // 2. Check Sale Items
    const salesCount = await prisma.saleItem.count({
      where: { productId: pId }
    });
    if (salesCount > 0) {
      throw new Error("Cannot hard delete product because it has associated sales invoices. Use soft delete instead.");
    }

    // 3. Check Sales Tracks
    const tracksCount = await prisma.salesTrack.count({
      where: { productId: pId }
    });
    if (tracksCount > 0) {
      throw new Error("Cannot hard delete product because it has associated transaction tracks. Use soft delete instead.");
    }

    // If completely unlinked, hard delete cleanly
    const p = await prisma.product.delete({
      where: { id: pId },
    });
    return this.serializeProduct(p);
  }
}
