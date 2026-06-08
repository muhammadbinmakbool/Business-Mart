import { prisma } from "@/lib/prisma";
import { assertDestructiveMode } from "@/lib/destructiveSession";

export class ProductRepository {
  static serializeProduct(p) {
    if (!p) return null;
    return {
      ...p,
      quantity: p.quantity ? Number(p.quantity) : 0,
      unitConversion: p.unitConversion ? Number(p.unitConversion) : null
    };
  }

  static async getAll() {
    const products = await prisma.product.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
    });
    return products.map(p => this.serializeProduct(p));
  }

  static async getAllWithStock() {
    const products = await prisma.product.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" }
    });

    return products.map(p => {
      const serialized = this.serializeProduct(p);
      return {
        ...serialized,
        availableStock: serialized.quantity
      };
    });
  }

  static async getById(id) {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id), isDeleted: false },
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
