import { SaleRepository } from "../repositories/SaleRepository";
import { saleSchema } from "../validations/saleSchema";
import { calculateAdjustment, round, roundWeight, roundRate } from "@/lib/financial";

export class SaleService {
  static async listSales() {
    const sales = await SaleRepository.getAll();
    return sales.map(this.serializeSale);
  }

  static async getSale(id) {
    const sale = await SaleRepository.getById(id);
    if (!sale) return null;
    return this.serializeSale(sale);
  }

  static async createSale(data) {
    const validated = saleSchema.parse(data);
    
    // 1. Calculate Item Amounts & Total Weight/Base Amount
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

    // 2. Calculate Adjustments
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

    // 3. Final Total
    const finalAmount = round(baseAmount + totalAdjustments);

    const saleData = {
      ...validated,
      items,
      adjustments,
      totalWeight: roundWeight(totalWeight),
      baseAmount: round(baseAmount),
      totalAdjustments: round(totalAdjustments),
      finalAmount: round(finalAmount),
      status: "PENDING"
    };

    return SaleRepository.create(saleData);
  }

  static async deleteSale(id) {
    return SaleRepository.delete(id);
  }

  static async updateStatus(id, status) {
    return SaleRepository.updateStatus(id, status);
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
      }))
    };
  }
}
