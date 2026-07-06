import { AdvanceRepository } from "../repositories/AdvanceRepository";
import { advanceSchema } from "../validations/intakeSchema";
import { DEFAULT_WEIGHT_UNIT } from "@/lib/units";
import { withOwnership } from "@/lib/session";
import { ApplicationLogger } from "@/lib/logger";

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
        baseQuantity: Number(a.intakeTransaction.baseQuantity),
        rate: a.intakeTransaction.rate ? Number(a.intakeTransaction.rate) : null,
        rateUnit: a.intakeTransaction.rateUnit || DEFAULT_WEIGHT_UNIT
      } : null,
      supplierInvoice: a.supplierInvoice ? {
        ...a.supplierInvoice,
        totalGrossValue: Number(a.supplierInvoice.totalGrossValue),
        totalDeductions: Number(a.supplierInvoice.totalDeductions),
        totalAdvances: Number(a.supplierInvoice.totalAdvances),
        finalPayableAmount: Number(a.supplierInvoice.finalPayableAmount),
        paidAmount: Number(a.supplierInvoice.paidAmount)
      } : null
    }));
  }

  static async recordAdvance(data) {
    const validated = advanceSchema.parse(data);
    const ownedData = await withOwnership(validated);
    const advance = await AdvanceRepository.create(ownedData);

    // Fetch session details
    let performedByUserId = 0;
    let performedByName = "system";
    try {
      const { getSession } = await import("@/lib/session");
      const session = await getSession();
      if (session) {
        performedByUserId = session.userId || 0;
        performedByName = session.userName || "system";
      }
    } catch (e) {}

    // Fetch Party details
    let partyName = "";
    try {
      const { PartyRepository } = await import("@/modules/parties/repositories/PartyRepository");
      const party = await PartyRepository.getById(advance.partyId);
      if (party) {
        partyName = party.name;
      }
    } catch (e) {}

    const amount = Number(advance.amount);
    const description = `${performedByName} recorded supplier cash advance of Rs. ${amount.toLocaleString()} for ${partyName || `Party #${advance.partyId}`}.`;

    try {
      const { logPaymentEvent } = await import("@/modules/activity-log/activityLogger");
      await logPaymentEvent({
        partyId: advance.partyId,
        partyName,
        paymentType: "CASH_OUT",
        eventType: "CASH_ADVANCE",
        amount,
        description,
        performedByUserId,
        performedByName,
        meta: {
          advanceId: advance.id,
          notes: advance.notes
        }
      });
    } catch (e) {
      ApplicationLogger.error("Failed to log advance payment event", e);
    }

    return advance;
  }

  static async getPartyAdvances(partyId) {
    const advances = await AdvanceRepository.getByPartyId(partyId);
    return advances.map(a => ({
      ...a,
      amount: Number(a.amount)
    }));
  }
}
