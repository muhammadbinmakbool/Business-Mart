import prisma from "@/lib/prisma";

export class ProductCategoryRepository {
  static async findAll() {
    return prisma.productCategory.findMany({
      where: { isDeleted: false },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: { where: { isDeleted: false } } }
        }
      }
    });
  }

  static async findById(id) {
    if (!id) return null;
    return prisma.productCategory.findFirst({
      where: {
        id: Number(id),
        isDeleted: false
      }
    });
  }

  static async findByName(name) {
    if (!name) return null;
    return prisma.productCategory.findFirst({
      where: {
        name: { equals: name.trim() },
        isDeleted: false
      }
    });
  }

  static async create(data) {
    return prisma.productCategory.create({
      data: {
        name: data.name.trim(),
        description: data.description || null,
        isActive: data.isActive !== false
      }
    });
  }

  static async update(id, data) {
    return prisma.productCategory.update({
      where: { id: Number(id) },
      data: {
        name: data.name ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined
      }
    });
  }

  static async delete(id, deletedBy = 0) {
    return prisma.productCategory.update({
      where: { id: Number(id) },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: Number(deletedBy) || 0
      }
    });
  }

  static async countActiveProducts(id) {
    return prisma.product.count({
      where: {
        productCategoryId: Number(id),
        isDeleted: false,
        isActive: true
      }
    });
  }

  static async countSoftDeletedProducts(id) {
    return prisma.product.count({
      where: {
        productCategoryId: Number(id),
        isDeleted: true
      }
    });
  }
}
