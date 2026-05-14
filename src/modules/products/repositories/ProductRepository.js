import { prisma } from "@/lib/prisma";

export class ProductRepository {
  static async getAll() {
    return prisma.product.findMany({
      orderBy: { name: "asc" },
    });
  }

  static async getAllWithStock() {
    const products = await prisma.product.findMany({
      include: {
        intakeTransactions: {
          select: { grossWeight: true },
          where: { status: { not: "CANCELLED" } }
        },
        saleItems: {
          select: { weight: true },
          where: { sale: { isDeleted: false, status: { not: "CANCELLED" } } }
        }
      },
      orderBy: { name: "asc" }
    });

    return products.map(p => {
      const totalIn = p.intakeTransactions.reduce((sum, i) => sum + Number(i.grossWeight), 0);
      const totalOut = p.saleItems.reduce((sum, s) => sum + Number(s.weight), 0);
      
      // Clean up relations for the frontend
      const { intakeTransactions, saleItems, ...rest } = p;
      
      return {
        ...rest,
        availableStock: totalIn - totalOut
      };
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

  static async delete(id) {
    // Delete related transactional data for practical cleanup
    // Note: IntakeAdvance is linked to Party/Intake, not directly to Product, but IntakeTransaction is.
    await prisma.intakeTransaction.deleteMany({ where: { productId: parseInt(id) } });
    
    return prisma.product.delete({
      where: { id: parseInt(id) },
    });
  }
}
