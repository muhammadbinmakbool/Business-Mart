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
    await prisma.intakeTransaction.deleteMany({ where: { productId: parseInt(id) } });
    
    const p = await prisma.product.delete({
      where: { id: parseInt(id) },
    });
    return this.serializeProduct(p);
  }
}
