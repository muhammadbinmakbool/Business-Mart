import { prisma } from "@/lib/prisma";

export class SaleRepository {
  static async getAll() {
    return prisma.saleTransaction.findMany({
      include: {
        party: true,
        _count: {
          select: { items: true }
        }
      },
      orderBy: { id: "desc" },
    });
  }

  static async getById(id) {
    return prisma.saleTransaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        party: true,
        items: {
          include: { product: true }
        },
        adjustments: true
      }
    });
  }

  static async create(data) {
    const { items, adjustments, ...saleData } = data;
    const nextNumber = await this.getNextSaleNumber();

    return prisma.saleTransaction.create({
      data: {
        ...saleData,
        saleNumber: nextNumber,
        items: {
          create: items
        },
        adjustments: {
          create: adjustments
        }
      }
    });
  }

  static async delete(id) {
    // Delete linked items and adjustments first (manual cascade for MSSQL)
    await prisma.saleItem.deleteMany({ where: { saleId: parseInt(id) } });
    await prisma.transactionAdjustment.deleteMany({ where: { saleId: parseInt(id) } });
    
    return prisma.saleTransaction.delete({
      where: { id: parseInt(id) }
    });
  }

  static async updateStatus(id, status) {
    return prisma.saleTransaction.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }

  static async getNextSaleNumber() {
    const lastEntry = await prisma.saleTransaction.findFirst({
      orderBy: { id: "desc" }
    });

    const nextId = lastEntry ? lastEntry.id + 1 : 1;
    return `SAL-${nextId.toString().padStart(6, "0")}`;
  }
}
