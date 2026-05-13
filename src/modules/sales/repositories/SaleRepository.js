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

  static async update(id, data) {
    const { items, adjustments, ...saleData } = data;
    const saleId = parseInt(id);

    return prisma.$transaction(async (tx) => {
      // 1. Delete existing items and adjustments
      await tx.saleItem.deleteMany({ where: { saleId } });
      await tx.transactionAdjustment.deleteMany({ where: { saleId } });

      // 2. Update the main transaction and create new related records
      return tx.saleTransaction.update({
        where: { id: saleId },
        data: {
          ...saleData,
          items: {
            create: items
          },
          adjustments: {
            create: adjustments
          }
        }
      });
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

  static async updateStatus(id, status, changeLog) {
    return prisma.saleTransaction.update({
      where: { id: parseInt(id) },
      data: { status, changeLog }
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
