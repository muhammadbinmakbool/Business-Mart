import { prisma } from "@/lib/prisma";

export class SaleRepository {
  static async getAll() {
    return prisma.saleTransaction.findMany({
      include: {
        party: true,
        items: {
          include: { product: true }
        }
      },
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" }
    });
  }

  static async getById(id) {
    return prisma.saleTransaction.findUnique({
      where: { id: parseInt(id) },
      include: {
        party: true,
        items: {
          include: { 
            product: true,
            salesTracks: {
              include: { intakeTransaction: true }
            }
          }
        },
        adjustments: true
      }
    });
  }

  static async create(saleData, items, adjustments = []) {
    const { partyId, ...rest } = saleData;
    return prisma.saleTransaction.create({
      data: {
        ...rest,
        party: { connect: { id: parseInt(partyId) } },
        items: {
          create: items.map(item => {
            const { productId, ...itemRest } = item;
            return {
              ...itemRest,
              product: { connect: { id: parseInt(productId) } }
            };
          })
        },
        adjustments: {
          create: adjustments
        }
      },
      include: {
        items: true,
        adjustments: true
      }
    });
  }

  static async getNextSaleNumber() {
    const lastEntry = await prisma.saleTransaction.findFirst({
      orderBy: { id: "desc" }
    });
    
    const nextId = (lastEntry?.id || 0) + 1;
    return `SALE-${nextId.toString().padStart(6, "0")}`;
  }

  static async softDelete(id) {
    return prisma.saleTransaction.update({
      where: { id: parseInt(id) },
      data: { isDeleted: true }
    });
  }
}
