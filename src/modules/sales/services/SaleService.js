import { SaleRepository } from "../repositories/SaleRepository";
import { prisma } from "@/lib/prisma";
import { PartyService } from "../../parties/services/PartyService";
import { calculateFinalTotal, calculateAdjustment, round, calculateTransactionTotals } from "@/lib/financial";
import { UnitService } from "../../products/services/UnitService";
import { ProductService } from "../../products/services/ProductService";


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
        _sum: { normalizedWeight: true }
      }),
      prisma.saleItem.aggregate({
        where: { 
          productId: parseInt(productId),
          sale: { isDeleted: false, status: { not: "CANCELLED" } }
        },
        _sum: { normalizedWeight: true }
      })
    ]);

    const totalIn = Number(intakeResult._sum.normalizedWeight || 0);
    const totalOut = Number(saleResult._sum.normalizedWeight || 0);

    return totalIn - totalOut;
  }


  static async listSales() {
    const sales = await SaleRepository.getAll();
    return JSON.parse(JSON.stringify(sales));
  }

  static async recordSale(data) {
    let { partyId, items, adjustments = [], entryDate, notes, newPartyData } = data;

    if (partyId === "new" && newPartyData) {
      const newParty = await PartyService.createParty(newPartyData);
      partyId = newParty.id;
    }

    // 1. Validate units and stock for each item
    const processedItems = [];
    for (const item of items) {
      const product = await ProductService.getProduct(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      // 1. Validate units and stock changes
      const validation = UnitService.validateCompatibility(item.unit || "KG", product);
      if (!validation.valid) throw new Error(validation.error);

      // 2. Normalize values
      const normalizedQty = UnitService.getNormalizedQuantity(item.weight, item.unit || "KG", product);
      const normalizedRate = UnitService.getNormalizedRate(item.rate || 0, item.unit || "KG", product);

      // 3. Stock Check
      const available = await this.getAvailableStock(item.productId);
      if (available < normalizedQty) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${available} ${UnitService.getBaseUnit(product.category)}`);
      }

      processedItems.push({
        ...item,
        normalizedWeight: normalizedQty,
        normalizedRate
      });
    }

    // 2. Generate sale number
    const saleNumber = await SaleRepository.getNextSaleNumber();

    // 3. Compute totals using centralized financial engine
    const { baseAmount, totalAdjustments, finalAmount, totalWeight } = calculateTransactionTotals(processedItems, adjustments);

    // Process adjustments for persistence
    const processedAdjustments = adjustments.map(adj => ({
      ...adj,
      calculatedAmount: calculateAdjustment(adj.method, adj.value, { baseAmount, totalWeight })
    }));


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
      processedItems.map(item => ({
        productId: parseInt(item.productId),
        weight: item.weight,
        unit: item.unit || "KG",
        normalizedWeight: item.normalizedWeight,
        rate: item.rate,
        rateUnit: item.unit || "KG",
        amount: item.amount
      })),
      processedAdjustments
    );

  }

  static async updateSale(id, data) {
    let { partyId, items, adjustments = [], entryDate, notes, newPartyData } = data;

    if (partyId === "new" && newPartyData) {
      const newParty = await PartyService.createParty(newPartyData);
      partyId = newParty.id;
    }
    const oldSale = await SaleRepository.getById(id);
    if (!oldSale) throw new Error("Sale not found");

    // 1. Validate units and stock changes
    const processedItems = [];
    for (const item of items) {
      const product = await ProductService.getProduct(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      // 1. Validate units and stock changes
      const validation = UnitService.validateCompatibility(item.unit || "KG", product);
      if (!validation.valid) throw new Error(validation.error);

      // 2. Normalize values
      const normalizedQty = UnitService.getNormalizedQuantity(item.weight, item.unit || "KG", product);
      const normalizedRate = UnitService.getNormalizedRate(item.rate || 0, item.unit || "KG", product);
      
      // 3. Stock Check (Replacement Logic)
      const oldItem = oldSale.items.find(oi => oi.productId === parseInt(item.productId));
      const oldNormalizedWeight = oldItem ? Number(oldItem.normalizedWeight) : 0;
      const currentAvailable = await this.getAvailableStock(item.productId);
      
      // Effective available is current + what we are replacing
      if ((currentAvailable + oldNormalizedWeight) < normalizedQty) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${currentAvailable + oldNormalizedWeight} ${UnitService.getBaseUnit(product.category)}`);
      }

      processedItems.push({
        ...item,
        normalizedWeight: normalizedQty,
        normalizedRate
      });
    }

    // 2. Compute totals using centralized financial engine
    const { baseAmount, totalAdjustments, finalAmount, totalWeight } = calculateTransactionTotals(processedItems, adjustments);

    // Process adjustments for persistence
    const processedAdjustments = adjustments.map(adj => ({
      ...adj,
      calculatedAmount: calculateAdjustment(adj.method, adj.value, { baseAmount, totalWeight })
    }));

    // 3. Update record (Prisma transaction)
    return prisma.$transaction(async (tx) => {
      await tx.saleItem.deleteMany({ where: { saleId: parseInt(id) } });
      await tx.transactionAdjustment.deleteMany({ where: { saleId: parseInt(id) } });

      return tx.saleTransaction.update({
        where: { id: parseInt(id) },
        data: {
          party: { connect: { id: parseInt(partyId) } },
          entryDate: entryDate ? new Date(entryDate) : new Date(),
          totalWeight,
          baseAmount,
          totalAdjustments,
          finalAmount,
          notes,
          items: {
            create: processedItems.map(item => ({
              product: { connect: { id: parseInt(item.productId) } },
              weight: item.weight,
              unit: item.unit || "KG",
              normalizedWeight: item.normalizedWeight,
              rate: item.rate,
              rateUnit: item.unit || "KG",
              amount: item.amount
            }))
          },
          adjustments: {
            create: processedAdjustments
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
