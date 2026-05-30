import { AdvanceRepository } from "../repositories/AdvanceRepository";
import { advanceSchema } from "../validations/intakeSchema";
import { DEFAULT_WEIGHT_UNIT } from "@/lib/units";

export class AdvanceService {
  static async listAdvances() {
    const advances = await AdvanceRepository.getAll();
    return advances.map(a => ({
      ...a,
      amount: Number(a.amount),
      intakeTransaction: a.intakeTransaction ? {
        ...a.intakeTransaction,
        grossWeight: Number(a.intakeTransaction.grossWeight),
        netWeight: a.intakeTransaction.netWeight ? Number(a.intakeTransaction.netWeight) : null,
        remainingWeight: a.intakeTransaction.remainingWeight ? Number(a.intakeTransaction.remainingWeight) : null,
        Bardana: a.intakeTransaction.Bardana ? Number(a.intakeTransaction.Bardana) : null,
        Khot: a.intakeTransaction.Khot ? Number(a.intakeTransaction.Khot) : null,
        normalizedWeight: Number(a.intakeTransaction.normalizedWeight),
        rate: a.intakeTransaction.rate ? Number(a.intakeTransaction.rate) : null,
        rateUnit: a.intakeTransaction.rateUnit || DEFAULT_WEIGHT_UNIT
      } : null,
      supplierInvoice: a.supplierInvoice ? {
        ...a.supplierInvoice,
        finalPayableAmount: Number(a.supplierInvoice.finalPayableAmount),
        paidAmount: Number(a.supplierInvoice.paidAmount)
      } : null
    }));
  }

  static async recordAdvance(data) {
    const validated = advanceSchema.parse(data);
    return AdvanceRepository.create(validated);
  }

  static async getPartyAdvances(partyId) {
    const advances = await AdvanceRepository.getByPartyId(partyId);
    return advances.map(a => ({
      ...a,
      amount: Number(a.amount)
    }));
  }
}
