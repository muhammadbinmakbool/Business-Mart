import { SaleRepository } from "../repositories/SaleRepository";
import { prisma } from "@/lib/prisma";
import { PartyService } from "../../parties/services/PartyService";
import { calculateFinalTotal, calculateAdjustment, round, calculateTransactionTotals } from "@/lib/financial";
import { UnitService } from "../../products/services/UnitService";
import { ProductService } from "../../products/services/ProductService";

export class SaleService {
  /**
   * Derives current available stock for a product from its snapshot quantity.
   */
  static async getAvailableStock(productId) {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) }
    });
    return product ? Number(product.quantity) : 0;
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

    // 1. Validate units and normalize quantities
    const processedItems = [];
    for (const item of items) {
      const product = await ProductService.getProduct(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      const validation = UnitService.validateCompatibility(item.unit || "KG", product);
      if (!validation.valid) throw new Error(validation.error);

      const normalizedQty = UnitService.getNormalizedQuantity(item.weight, item.unit || "KG", product);
      const normalizedRate = UnitService.getNormalizedRate(item.rate || 0, item.rateUnit || "KG", product);

      processedItems.push({
        ...item,
        normalizedWeight: normalizedQty,
        normalizedRate,
        product
      });
    }

    // 2. Compute totals using centralized financial engine
    const { baseAmount, totalAdjustments, finalAmount, totalWeight } = calculateTransactionTotals(processedItems, adjustments);

    // Process adjustments for persistence
    const processedAdjustments = adjustments.map(adj => {
      const { id, saleId, ...cleanAdj } = adj;
      let totalBagCount = 0;
      processedItems.forEach(pi => {
        if (pi.product) {
          try {
            const bagFactor = Number(pi.product.unitConversion);
            if (bagFactor > 0) {
              totalBagCount += pi.normalizedWeight / bagFactor;
            }
          } catch (e) {}
        }
      });
      return {
        ...cleanAdj,
        calculatedAmount: calculateAdjustment(cleanAdj.method, cleanAdj.value, { 
          baseAmount, 
          totalWeight, 
          bagCount: totalBagCount,
          adjustmentUnit: cleanAdj.unit
        })
      };
    });

    // 3. Atomically execute transaction
    return prisma.$transaction(async (tx) => {
      // 3.1 Fetch current quantities within the transaction for lock & check
      const productIds = processedItems.map(item => parseInt(item.productId));
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(dbProducts.map(p => [p.id, p]));

      // 3.2 Validate stock safety (INSUFFICIENT_STOCK) and ensure Product.quantity >= 0
      for (const item of processedItems) {
        const product = productMap.get(parseInt(item.productId));
        if (!product || Number(product.quantity) < item.normalizedWeight) {
          throw new Error(`INSUFFICIENT_STOCK: Product "${product?.name || item.productId}" has insufficient stock. Available: ${product ? Number(product.quantity) : 0} ${UnitService.getBaseUnit(product?.category || "WEIGHT")}`);
        }
      }

      // 3.3 Get next sale number
      const lastEntry = await tx.saleTransaction.findFirst({
        orderBy: { id: "desc" }
      });
      const nextId = lastEntry ? lastEntry.id + 1 : 1;
      const saleNumber = `SAL-${nextId.toString().padStart(6, "0")}`;

      // 3.4 Create Sale Transaction and items
      const sale = await tx.saleTransaction.create({
        data: {
          saleNumber,
          entryDate: entryDate ? new Date(entryDate) : new Date(),
          totalWeight,
          baseAmount,
          totalAdjustments,
          finalAmount,
          status: "PENDING",
          notes,
          party: { connect: { id: parseInt(partyId) } },
          items: {
            create: processedItems.map(item => ({
              product: { connect: { id: parseInt(item.productId) } },
              weight: item.weight,
              unit: item.unit || "KG",
              normalizedWeight: item.normalizedWeight,
              rate: item.rate,
              rateUnit: item.rateUnit || "KG",
              amount: item.amount
            }))
          },
          adjustments: {
            create: processedAdjustments
          }
        },
        include: { items: true, adjustments: true }
      });

      // Link SalesTrack records if specified
      for (let i = 0; i < processedItems.length; i++) {
        const item = processedItems[i];
        if (item.salesTrackId) {
          const dbItem = sale.items.find(di => di.productId === parseInt(item.productId));
          if (dbItem) {
            await tx.salesTrack.update({
              where: { id: parseInt(item.salesTrackId) },
              data: {
                isBilled: true,
                saleTransactionId: sale.id,
                saleItemId: dbItem.id
              }
            });
          }
        }
      }

      // 3.5 Batched Update Product quantities concurrently in parallel using Promise.all
      await Promise.all(processedItems.map(item =>
        tx.product.update({
          where: { id: parseInt(item.productId) },
          data: { quantity: { decrement: item.normalizedWeight } }
        })
      ));

      return sale;
    });
  }

  static async updateSale(id, data) {
    let { partyId, items, adjustments = [], entryDate, notes, newPartyData } = data;

    if (partyId === "new" && newPartyData) {
      const newParty = await PartyService.createParty(newPartyData);
      partyId = newParty.id;
    }
    const oldSale = await SaleRepository.getById(id);
    if (!oldSale) throw new Error("Sale not found");

    // 1. Validate units and normalize new items
    const processedItems = [];
    for (const item of items) {
      const product = await ProductService.getProduct(item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      const validation = UnitService.validateCompatibility(item.unit || "KG", product);
      if (!validation.valid) throw new Error(validation.error);

      const normalizedQty = UnitService.getNormalizedQuantity(item.weight, item.unit || "KG", product);
      const normalizedRate = UnitService.getNormalizedRate(item.rate || 0, item.rateUnit || "KG", product);

      processedItems.push({
        ...item,
        normalizedWeight: normalizedQty,
        normalizedRate,
        product
      });
    }

    // 2. Compute totals using centralized financial engine
    const { baseAmount, totalAdjustments, finalAmount, totalWeight } = calculateTransactionTotals(processedItems, adjustments);

    // Process adjustments for persistence
    const processedAdjustments = adjustments.map(adj => {
      const { id, saleId, ...cleanAdj } = adj;
      let totalBagCount = 0;
      processedItems.forEach(pi => {
        if (pi.product) {
          try {
            const bagFactor = Number(pi.product.unitConversion);
            if (bagFactor > 0) {
              totalBagCount += pi.normalizedWeight / bagFactor;
            }
          } catch (e) {}
        }
      });
      return {
        ...cleanAdj,
        calculatedAmount: calculateAdjustment(cleanAdj.method, cleanAdj.value, { 
          baseAmount, 
          totalWeight, 
          bagCount: totalBagCount,
          adjustmentUnit: cleanAdj.unit
        })
      };
    });

    // 3. Atomically execute transaction
    return prisma.$transaction(async (tx) => {
      // 3.1 Compute deltas per product ID
      const deltas = new Map(); // productId -> delta (positive = add back stock, negative = deduct stock)

      // Add back old items (restoring stock)
      for (const oldItem of oldSale.items) {
        const currentDelta = deltas.get(oldItem.productId) || 0;
        deltas.set(oldItem.productId, currentDelta + Number(oldItem.normalizedWeight));
      }

      // Subtract new items (selling stock)
      for (const newItem of processedItems) {
        const currentDelta = deltas.get(parseInt(newItem.productId)) || 0;
        deltas.set(parseInt(newItem.productId), currentDelta - newItem.normalizedWeight);
      }

      // 3.2 Fetch all involved product snapshots for validation
      const productIds = Array.from(deltas.keys());
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(dbProducts.map(p => [p.id, p]));

      // 3.3 Validate safety constraint (Product.quantity + delta >= 0 for negative deltas)
      for (const [productId, delta] of deltas.entries()) {
        if (delta < 0) {
          const product = productMap.get(productId);
          const currentQty = product ? Number(product.quantity) : 0;
          if (currentQty + delta < 0) {
            throw new Error(`INSUFFICIENT_STOCK: Updating this sale requires an additional ${Math.abs(delta) - currentQty} KG of product "${product?.name || productId}".`);
          }
        }
      }

      // 3.4 Unlink previous SalesTrack records for this sale
      await tx.salesTrack.updateMany({
        where: { saleTransactionId: parseInt(id) },
        data: {
          isBilled: false,
          saleTransactionId: null,
          saleItemId: null
        }
      });

      // Delete old items & adjustments
      await tx.saleItem.deleteMany({ where: { saleId: parseInt(id) } });
      await tx.transactionAdjustment.deleteMany({ where: { saleId: parseInt(id) } });

      // 3.5 Update transaction details & items
      const updatedSale = await tx.saleTransaction.update({
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
              rateUnit: item.rateUnit || "KG",
              amount: item.amount
            }))
          },
          adjustments: {
            create: processedAdjustments
          }
        },
        include: { items: true, adjustments: true }
      });

      // Link new SalesTrack records if specified
      for (let i = 0; i < processedItems.length; i++) {
        const item = processedItems[i];
        if (item.salesTrackId) {
          const dbItem = updatedSale.items.find(di => di.productId === parseInt(item.productId));
          if (dbItem) {
            await tx.salesTrack.update({
              where: { id: parseInt(item.salesTrackId) },
              data: {
                isBilled: true,
                saleTransactionId: updatedSale.id,
                saleItemId: dbItem.id
              }
            });
          }
        }
      }

      // 3.6 Apply product snapshot quantity deltas concurrently in parallel batch using Promise.all
      await Promise.all(
        Array.from(deltas.entries()).map(([productId, delta]) => {
          if (Math.abs(delta) < 0.001) return Promise.resolve(); // No change
          return tx.product.update({
            where: { id: productId },
            data: { quantity: { increment: delta } }
          });
        })
      );

      return updatedSale;
    });
  }

  static async updateStatus(id, status) {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.saleTransaction.findUnique({
        where: { id: parseInt(id) },
        include: { items: true }
      });
      if (!sale) throw new Error("Sale transaction not found");

      const oldStatus = sale.status;
      const newStatus = status;

      if (oldStatus !== "CANCELLED" && newStatus === "CANCELLED") {
        // Reversal: restore stock snapshots
        await Promise.all(sale.items.map(item => 
          tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: Number(item.normalizedWeight) } }
          })
        ));

        // Reset isBilled and clear link on SalesTrack records for this cancelled sale
        await tx.salesTrack.updateMany({
          where: { saleTransactionId: parseInt(id) },
          data: {
            isBilled: false,
            saleTransactionId: null,
            saleItemId: null
          }
        });
      } else if (oldStatus === "CANCELLED" && newStatus !== "CANCELLED") {
        // Reactivation: check availability and deduct snapshots
        const productIds = sale.items.map(item => item.productId);
        const dbProducts = await tx.product.findMany({
          where: { id: { in: productIds } }
        });
        const productMap = new Map(dbProducts.map(p => [p.id, p]));

        // Validate stock
        for (const item of sale.items) {
          const product = productMap.get(item.productId);
          if (!product || Number(product.quantity) < Number(item.normalizedWeight)) {
            throw new Error(`INSUFFICIENT_STOCK: Reactivating this sale would reduce "${product?.name || item.productId}" stock below zero.`);
          }
        }

        // Apply decrement
        await Promise.all(sale.items.map(item => 
          tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: Number(item.normalizedWeight) } }
          })
        ));
      }

      return tx.saleTransaction.update({
        where: { id: parseInt(id) },
        data: { status }
      });
    });
  }

  static async deleteSale(id) {
    return prisma.$transaction(async (tx) => {
      // 1. Get current sale with items
      const sale = await tx.saleTransaction.findUnique({
        where: { id: parseInt(id) },
        include: { items: true }
      });
      if (!sale) throw new Error("Sale transaction not found");

      // 2. Restore snapshot stock if sale was active (not already cancelled or soft-deleted)
      if (!sale.isDeleted && sale.status !== "CANCELLED") {
        await Promise.all(sale.items.map(item => 
          tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: Number(item.normalizedWeight) } }
          })
        ));
      }

      // 3. Reset isBilled and clear link on previous SalesTrack records for this sale
      await tx.salesTrack.updateMany({
        where: { saleTransactionId: parseInt(id) },
        data: {
          isBilled: false,
          saleTransactionId: null,
          saleItemId: null
        }
      });

      // 4. Soft delete the sale transaction
      return tx.saleTransaction.update({
        where: { id: parseInt(id) },
        data: { isDeleted: true }
      });
    });
  }

  static async getSale(id) {
    const sale = await SaleRepository.getById(id);
    return JSON.parse(JSON.stringify(sale));
  }
}
