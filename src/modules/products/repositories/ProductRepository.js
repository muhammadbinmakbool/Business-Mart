import { prisma } from "@/lib/prisma";

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
      orderBy: { name: "asc" },
    });
    return products.map(p => this.serializeProduct(p));
  }

  static async getAllWithStock() {
    const products = await prisma.product.findMany({
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
      where: { id: parseInt(id) },
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

  static async delete(id) {
    const pId = parseInt(id);

    // 1. Check Intake transactions
    const intakesCount = await prisma.intakeTransaction.count({
      where: { productId: pId }
    });
    if (intakesCount > 0) {
      throw new Error("Cannot delete product because it has associated intake transactions. Deactivate the product instead to prevent future selections.");
    }

    // 2. Check Sale Items
    const salesCount = await prisma.saleItem.count({
      where: { productId: pId }
    });
    if (salesCount > 0) {
      throw new Error("Cannot delete product because it has associated sales invoices. Deactivate the product instead to prevent future selections.");
    }

    // 3. Check Sales Tracks
    const tracksCount = await prisma.salesTrack.count({
      where: { productId: pId }
    });
    if (tracksCount > 0) {
      throw new Error("Cannot delete product because it has associated transaction tracks. Deactivate the product instead to prevent future selections.");
    }

    // If completely unlinked, delete cleanly
    const p = await prisma.product.delete({
      where: { id: pId },
    });
    return this.serializeProduct(p);
  }
}
