import { SaleRepository } from "../repositories/SaleRepository";
import { prisma } from "@/lib/prisma";

export class SaleService {
  /**
   * Derives current available stock for a product.
   * Rule: Intake - Sales
   */
  static async getAvailableStock(productId) {
    const [intakeResult, saleResult] = await Promise.all([
      prisma.intakeTransaction.aggregate({
        where: { 
          productId: parseInt(productId),
          status: { not: "CANCELLED" }
        },
        _sum: { grossWeight: true }
      }),
      prisma.saleItem.aggregate({
        where: { 
          productId: parseInt(productId),
          sale: { isDeleted: false, status: { not: "CANCELLED" } }
        },
        _sum: { weight: true }
      })
    ]);

    const totalIn = Number(intakeResult._sum.grossWeight || 0);
    const totalOut = Number(saleResult._sum.weight || 0);

    return totalIn - totalOut;
  }

  static async listSales() {
    const sales = await SaleRepository.getAll();
    return JSON.parse(JSON.stringify(sales));
  }

  static async recordSale(data) {
    const { partyId, items, adjustments = [], entryDate, notes } = data;

    // 1. Validate stock for each item
    for (const item of items) {
      const available = await this.getAvailableStock(item.productId);
      if (available < Number(item.weight)) {
        throw new Error(`Insufficient stock for product. Available: ${available} KG`);
      }
    }

    // 2. Generate sale number
    const saleNumber = await SaleRepository.getNextSaleNumber();

    // 3. Compute totals (Operational math)
    const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0);
    const baseAmount = items.reduce((sum, item) => sum + (Number(item.weight) * Number(item.rate)), 0);
    
    // Simple adjustment calc for now
    const totalAdjustments = adjustments.reduce((sum, adj) => {
      const amt = Number(adj.calculatedAmount);
      return adj.direction === "ADD" ? sum + amt : sum - amt;
    }, 0);

    const finalAmount = baseAmount + totalAdjustments;

    // 4. Create record
    return SaleRepository.create(
      {
        saleNumber,
        partyId: parseInt(partyId),
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        totalWeight,
        baseAmount,
        totalAdjustments,
        finalAmount,
        status: "PENDING",
        notes
      },
      items.map(item => ({
        productId: parseInt(item.productId),
        weight: item.weight,
        rate: item.rate,
        amount: Number(item.weight) * Number(item.rate)
      })),
      adjustments
    );
  }

  static async updateSale(id, data) {
    const { partyId, items, adjustments = [], entryDate, notes } = data;
    const oldSale = await SaleRepository.getById(id);
    if (!oldSale) throw new Error("Sale not found");

    // 1. Validate stock changes
    for (const item of items) {
      const oldItem = oldSale.items.find(oi => oi.productId === parseInt(item.productId));
      const oldWeight = oldItem ? Number(oldItem.weight) : 0;
      const currentAvailable = await this.getAvailableStock(item.productId);
      
      // Effective available is current + what we are replacing
      if ((currentAvailable + oldWeight) < Number(item.weight)) {
        throw new Error(`Insufficient stock for product. Available: ${currentAvailable + oldWeight} KG`);
      }
    }

    // 2. Compute totals
    const totalWeight = items.reduce((sum, item) => sum + Number(item.weight), 0);
    const baseAmount = items.reduce((sum, item) => sum + (Number(item.weight) * Number(item.rate)), 0);
    const totalAdjustments = adjustments.reduce((sum, adj) => {
      const amt = Number(adj.calculatedAmount);
      return adj.direction === "ADD" ? sum + amt : sum - amt;
    }, 0);
    const finalAmount = baseAmount + totalAdjustments;

    // 3. Update record (Prisma transaction)
    return prisma.$transaction(async (tx) => {
      // Delete old items and adjustments
      await tx.saleItem.deleteMany({ where: { saleId: parseInt(id) } });
      await tx.transactionAdjustment.deleteMany({ where: { saleId: parseInt(id) } });

      return tx.saleTransaction.update({
        where: { id: parseInt(id) },
        data: {
          partyId: parseInt(partyId),
          entryDate: entryDate ? new Date(entryDate) : new Date(),
          totalWeight,
          baseAmount,
          totalAdjustments,
          finalAmount,
          notes,
          items: {
            create: items.map(item => ({
              productId: parseInt(item.productId),
              weight: item.weight,
              rate: item.rate,
              amount: Number(item.weight) * Number(item.rate)
            }))
          },
          adjustments: {
            create: adjustments
          }
        },
        include: { items: true, adjustments: true }
      });
    });
  }

  static async updateStatus(id, status) {
    return prisma.saleTransaction.update({
      where: { id: parseInt(id) },
      data: { status }
    });
  }

  static async deleteSale(id) {
    return SaleRepository.softDelete(id);
  }

  static async getSale(id) {
    const sale = await SaleRepository.getById(id);
    return JSON.parse(JSON.stringify(sale));
  }
}
