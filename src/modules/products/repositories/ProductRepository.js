import { prisma } from "@/lib/prisma";

export class ProductRepository {
  static async getAll() {
    return prisma.product.findMany({
      orderBy: { name: "asc" },
    });
  }

  static async getById(id) {
    return prisma.product.findUnique({
      where: { id: parseInt(id) },
    });
  }

  static async create(data) {
    return prisma.product.create({
      data,
    });
  }

  static async update(id, data) {
    return prisma.product.update({
      where: { id: parseInt(id) },
      data,
    });
  }

  static async toggleStatus(id, isActive) {
    return prisma.product.update({
      where: { id: parseInt(id) },
      data: { isActive },
    });
  }
}
