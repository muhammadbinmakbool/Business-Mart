import { SaleRepository } from "../repositories/SaleRepository";
import { prisma } from "@/lib/prisma";
import { PartyService } from "../../parties/services/PartyService";
import { calculateFinalTotal, calculateAdjustment, round, calculateTransactionTotals, calculateInvoiceClearingState } from "@/lib/financial";
import { UnitService } from "../../products/services/UnitService";
import { ProductService } from "../../products/services/ProductService";
import { InventoryService } from "../../products/services/InventoryService";
import { createAppError } from "@/lib/errors/AppError";
import { emitActivity } from "@/modules/activity-log/activityLogger";

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
      // 3.1 Fetch any sales tracks to get linked intake weights
      const salesTrackIds = processedItems
        .map(item => item.salesTrackId ? parseInt(item.salesTrackId) : null)
        .filter(Boolean);

      const salesTracks = salesTrackIds.length > 0
        ? await tx.salesTrack.findMany({
            where: { id: { in: salesTrackIds } },
            include: { intakeTransaction: true }
          })
        : [];

      const salesTrackMap = new Map(salesTracks.map(st => [st.id, st]));

      // 3.2 Calculate general pool requirements (excluding weights of linked SOLD intakes)
      const generalPoolRequirements = new Map();
      for (const item of processedItems) {
        let required = item.normalizedWeight;
        if (item.salesTrackId) {
          const st = salesTrackMap.get(parseInt(item.salesTrackId));
          if (st && st.intakeTransaction && st.intakeTransaction.status === "SOLD") {
            required = Math.max(0, item.normalizedWeight - Number(st.intakeTransaction.normalizedWeight));
          }
        }
        const prodId = parseInt(item.productId);
        generalPoolRequirements.set(prodId, (generalPoolRequirements.get(prodId) || 0) + required);
      }

      // 3.3 Fetch current quantities within the transaction for lock & check
      const productIds = processedItems.map(item => parseInt(item.productId));
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      const productMap = new Map(dbProducts.map(p => [p.id, p]));

      // 3.4 Validate stock safety against general pool requirements
      for (const [prodId, requiredWeight] of generalPoolRequirements.entries()) {
        const product = productMap.get(prodId);
        const currentQty = product ? Number(product.quantity) : 0;
        if (currentQty < requiredWeight) {
          throw createAppError("INSUFFICIENT_STOCK", `Product "${product?.name || prodId}" has insufficient stock. Available: ${currentQty} ${UnitService.getBaseUnit(product?.category || "WEIGHT")}`);
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

      // 3.5 Delegate to InventoryService (no-op under intake-driven model)
      await InventoryService.handleSaleCreated(processedItems, tx);

      return sale;
    });

    await emitActivity({
      entityType: "SALE",
      entityId: sale.id,
      action: "CREATED",
      description: `Sale ${sale.saleNumber} created`,
      meta: {
        buyerId: sale.partyId,
        productIds: sale.items.map(item => item.productId),
        totalWeight: Number(sale.totalWeight),
        finalAmount: Number(sale.finalAmount)
      }
    });

    return sale;
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

      // 3.2 Calculate general pool requirements for old items
      const oldGeneralPoolRequirements = new Map();
      for (const oldItem of oldSale.items) {
        let required = Number(oldItem.normalizedWeight);
        const linkedTrack = oldItem.salesTracks?.[0];
        if (linkedTrack && linkedTrack.intakeTransaction && linkedTrack.intakeTransaction.status === "SOLD") {
          required = Math.max(0, required - Number(linkedTrack.intakeTransaction.normalizedWeight));
        }
        const prodId = oldItem.productId;
        oldGeneralPoolRequirements.set(prodId, (oldGeneralPoolRequirements.get(prodId) || 0) + required);
      }

      // 3.3 Fetch new items sales track ids to check linked intakes
      const newSalesTrackIds = processedItems
        .map(item => item.salesTrackId ? parseInt(item.salesTrackId) : null)
        .filter(Boolean);

      const newSalesTracks = newSalesTrackIds.length > 0
        ? await tx.salesTrack.findMany({
            where: { id: { in: newSalesTrackIds } },
            include: { intakeTransaction: true }
          })
        : [];

      const newSalesTrackMap = new Map(newSalesTracks.map(st => [st.id, st]));

      // Calculate general pool requirements for new items
      const newGeneralPoolRequirements = new Map();
      for (const item of processedItems) {
        let required = item.normalizedWeight;
        if (item.salesTrackId) {
          const st = newSalesTrackMap.get(parseInt(item.salesTrackId));
          if (st && st.intakeTransaction && st.intakeTransaction.status === "SOLD") {
            required = Math.max(0, item.normalizedWeight - Number(st.intakeTransaction.normalizedWeight));
          }
        }
        const prodId = parseInt(item.productId);
        newGeneralPoolRequirements.set(prodId, (newGeneralPoolRequirements.get(prodId) || 0) + required);
      }

      // Calculate net change on general pool requirements
      const generalPoolDeltas = new Map();
      const allProductIds = new Set([
        ...oldGeneralPoolRequirements.keys(),
        ...newGeneralPoolRequirements.keys()
      ]);

      for (const prodId of allProductIds) {
        const oldReq = oldGeneralPoolRequirements.get(prodId) || 0;
        const newReq = newGeneralPoolRequirements.get(prodId) || 0;
        generalPoolDeltas.set(prodId, oldReq - newReq);
      }

      // 3.4 Fetch all involved product snapshots for validation
      const dbProducts = await tx.product.findMany({
        where: { id: { in: Array.from(allProductIds) } }
      });
      const productMap = new Map(dbProducts.map(p => [p.id, p]));

      // 3.5 Validate safety constraint against general pool requirements
      for (const [productId, delta] of generalPoolDeltas.entries()) {
        if (delta < 0) {
          const product = productMap.get(productId);
          const currentQty = product ? Number(product.quantity) : 0;
          if (currentQty + delta < 0) {
            throw createAppError("INSUFFICIENT_STOCK", `Updating this sale requires an additional ${Math.abs(delta) - currentQty} KG of product "${product?.name || productId}".`);
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

      // 3.6 Delegate to InventoryService (no-op under intake-driven model)
      await InventoryService.handleSaleUpdated(deltas, tx);

      return updatedSale;
    });

    await emitActivity({
      entityType: "SALE",
      entityId: updatedSale.id,
      action: "UPDATED",
      description: `Sale ${updatedSale.saleNumber} updated`,
      meta: {
        buyerId: updatedSale.partyId,
        productIds: updatedSale.items.map(item => item.productId),
        totalWeight: Number(updatedSale.totalWeight),
        finalAmount: Number(updatedSale.finalAmount)
      }
    });

    return updatedSale;
  }

  static async updateStatus(id, status) {
    const updated = await prisma.$transaction(async (tx) => {
      const sale = await tx.saleTransaction.findUnique({
        where: { id: parseInt(id) },
        include: { items: true }
      });
      if (!sale) throw new Error("Sale transaction not found");

      const oldStatus = sale.status;
      const newStatus = status;

      if (oldStatus !== "CANCELLED" && newStatus === "CANCELLED") {
        // Reset isBilled and clear link on SalesTrack records for this cancelled sale
        await tx.salesTrack.updateMany({
          where: { saleTransactionId: parseInt(id) },
          data: {
            isBilled: false,
            saleTransactionId: null,
            saleItemId: null
          }
        });
      }

      // Delegate to InventoryService (no-op under intake-driven model)
      await InventoryService.handleSaleStatusUpdated(sale.items, oldStatus, newStatus, tx);

      let paidAmount = sale.paidAmount;
      if (newStatus === "CLEARED") {
        paidAmount = sale.finalAmount;
      } else if (newStatus === "PENDING") {
        paidAmount = 0;
      }

      const clearingState = calculateInvoiceClearingState(sale.finalAmount, paidAmount);
      const paymentStatus = clearingState.paymentStatus;

      return tx.saleTransaction.update({
        where: { id: parseInt(id) },
        data: { 
          status,
          paidAmount,
          paymentStatus
        }
      });
    });

    let action = "UPDATED";
    if (status === "CLEARED") action = "CLEARED";
    if (status === "CANCELLED") action = "CANCELLED";

    await emitActivity({
      entityType: "SALE",
      entityId: updated.id,
      action,
      description: `Sale ${updated.saleNumber} status updated to ${status}`,
      meta: {
        buyerId: updated.partyId,
        status: updated.status,
        finalAmount: Number(updated.finalAmount)
      }
    });

    return updated;
  }

  static async deleteSale(id) {
    const deleted = await prisma.$transaction(async (tx) => {
      // 1. Get current sale with items
      const sale = await tx.saleTransaction.findUnique({
        where: { id: parseInt(id) },
        include: { items: true }
      });
      if (!sale) throw new Error("Sale transaction not found");

      // 2. Delegate to InventoryService (no-op under intake-driven model)
      await InventoryService.handleSaleDeleted(sale.items, tx);

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

    await emitActivity({
      entityType: "SALE",
      entityId: deleted.id,
      action: "DELETED",
      description: `Sale ${deleted.saleNumber} deleted (soft-delete)`,
      meta: {
        buyerId: deleted.partyId,
        finalAmount: Number(deleted.finalAmount)
      }
    });

    return deleted;
  }

  static async getSale(id) {
    const sale = await SaleRepository.getById(id);
    return JSON.parse(JSON.stringify(sale));
  }

  static async recordPayment(id, amount) {
    const saleId = parseInt(id);
    const amt = Number(amount);
    if (isNaN(saleId)) throw new Error("Invalid Sale ID");
    if (isNaN(amt) || amt <= 0) throw new Error("Payment amount must be greater than zero");

    const updated = await prisma.$transaction(async (tx) => {
      const sale = await tx.saleTransaction.findUnique({
        where: { id: saleId }
      });

      if (!sale) throw new Error("Sale transaction not found");
      if (sale.status === "CANCELLED") throw new Error("Cannot record payment on a cancelled invoice");

      const total = Number(sale.finalAmount);
      const currentPaid = Number(sale.paidAmount || 0);
      const remaining = Math.max(0, total - currentPaid);

      if (amt > remaining) {
        throw new Error(`Payment amount Rs. ${amt} exceeds the remaining balance of Rs. ${remaining}`);
      }

      const newPaid = currentPaid + amt;
      const clearingState = calculateInvoiceClearingState(total, newPaid);
      
      return tx.saleTransaction.update({
        where: { id: saleId },
        data: {
          paidAmount: newPaid,
          paymentStatus: clearingState.paymentStatus,
          status: clearingState.paymentStatus
        }
      });
    });

    await emitActivity({
      entityType: "SALE",
      entityId: updated.id,
      action: updated.status === "CLEARED" ? "CLEARED" : "UPDATED",
      description: `Recorded partial payment of Rs. ${amt.toLocaleString()} on Sale ${updated.saleNumber}. Total paid: Rs. ${Number(updated.paidAmount).toLocaleString()}`,
      meta: {
        buyerId: updated.partyId,
        paymentAmount: amt,
        paidAmount: Number(updated.paidAmount),
        paymentStatus: updated.paymentStatus
      }
    });

    return updated;
  }
}

