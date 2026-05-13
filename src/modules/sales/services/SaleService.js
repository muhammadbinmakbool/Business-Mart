import { SaleRepository } from "../repositories/SaleRepository";
import { saleSchema } from "../validations/saleSchema";
import { calculateAdjustment, round, roundWeight, roundRate } from "@/lib/financial";

export class SaleService {
  static async listSales() {
    const sales = await SaleRepository.getAll();
    return sales.filter(s => !s.isDeleted).map(this.serializeSale);
  }

  static async getSale(id) {
    const sale = await SaleRepository.getById(id);
    if (!sale || sale.isDeleted) return null;
    return this.serializeSale(sale);
  }

  static async createSale(data) {
    const validated = saleSchema.parse(data);
    const saleData = this.calculateSaleTotals(validated);
    
    const log = [{
      timestamp: new Date().toISOString(),
      action: "CREATED",
      summary: "Invoice generated"
    }];

    return SaleRepository.create({ 
      ...saleData, 
      status: "PENDING",
      changeLog: JSON.stringify(log)
    });
  }

  static async updateSale(id, data) {
    const validated = saleSchema.parse(data);
    const saleData = this.calculateSaleTotals(validated);
    
    const currentSale = await SaleRepository.getById(id);
    if (!currentSale) throw new Error("Sale not found");

    // 1. Create Snapshot of previous state
    const previousState = {
      baseAmount: Number(currentSale.baseAmount),
      totalAdjustments: Number(currentSale.totalAdjustments),
      finalAmount: Number(currentSale.finalAmount),
      itemCount: currentSale.items.length,
      adjustmentCount: currentSale.adjustments.length,
      updatedAt: currentSale.updatedAt
    };

    // 2. Generate Change Log Entry
    const newLogEntry = {
      timestamp: new Date().toISOString(),
      action: "UPDATED",
      summary: `Invoice modified. Prev Total: Rs. ${previousState.finalAmount}`
    };

    const existingLog = currentSale.changeLog ? JSON.parse(currentSale.changeLog) : [];
    const updatedLog = [...existingLog, newLogEntry];

    return SaleRepository.update(id, { 
      ...saleData,
      previousState: JSON.stringify(previousState),
      changeLog: JSON.stringify(updatedLog)
    });
  }

  static calculateSaleTotals(validated) {
    let totalWeight = 0;
    let baseAmount = 0;
    
    const items = validated.items.map(item => {
      const amount = round(item.weight * item.rate);
      totalWeight += item.weight;
      baseAmount += amount;
      
      return {
        ...item,
        amount,
        weight: roundWeight(item.weight),
        rate: roundRate(item.rate)
      };
    });

    let totalAdjustments = 0;
    const adjustments = validated.adjustments.map(adj => {
      const calculatedAmount = calculateAdjustment(adj.method, adj.value, { 
        baseAmount, 
        totalWeight 
      });
      
      if (adj.direction === "SUBTRACT") {
        totalAdjustments -= calculatedAmount;
      } else {
        totalAdjustments += calculatedAmount;
      }

      return {
        ...adj,
        calculatedAmount
      };
    });

    const finalAmount = round(baseAmount + totalAdjustments);

    return {
      ...validated,
      items,
      adjustments,
      totalWeight: roundWeight(totalWeight),
      baseAmount: round(baseAmount),
      totalAdjustments: round(totalAdjustments),
      finalAmount: round(finalAmount)
    };
  }

  static async deleteSale(id) {
    // Soft delete support (can switch to hard delete if preferred, but schema supports flag now)
    return SaleRepository.delete(id);
  }

  static async updateStatus(id, status) {
    const currentSale = await SaleRepository.getById(id);
    const existingLog = currentSale?.changeLog ? JSON.parse(currentSale.changeLog) : [];
    
    const updatedLog = [...existingLog, {
      timestamp: new Date().toISOString(),
      action: "STATUS_CHANGE",
      summary: `Status changed to ${status}`
    }];

    return SaleRepository.updateStatus(id, status, JSON.stringify(updatedLog));
  }

  /**
   * Serializes decimals to numbers for Client Components
   */
  static serializeSale(sale) {
    return {
      ...sale,
      totalWeight: Number(sale.totalWeight),
      baseAmount: Number(sale.baseAmount),
      totalAdjustments: Number(sale.totalAdjustments),
      finalAmount: Number(sale.finalAmount),
      items: sale.items?.map(item => ({
        ...item,
        weight: Number(item.weight),
        rate: Number(item.rate),
        amount: Number(item.amount)
      })),
      adjustments: sale.adjustments?.map(adj => ({
        ...adj,
        value: Number(adj.value),
        calculatedAmount: Number(adj.calculatedAmount)
      })),
      changeLog: sale.changeLog ? JSON.parse(sale.changeLog) : [],
      previousState: sale.previousState ? JSON.parse(sale.previousState) : null
    };
  }
}
