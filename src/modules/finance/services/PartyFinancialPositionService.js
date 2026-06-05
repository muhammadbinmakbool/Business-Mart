import { prisma } from "@/lib/prisma";
import { PartyFinanceCalculator } from "../calculations/partyFinanceCalculator";

export class PartyFinancialPositionService {
  /**
   * Fetches database records for a party and delegates to the calculator.
   * @param {number|string} partyId - The unique ID of the target party
   * @returns {Promise<object>} Derived financial position summary
   */
  static async getPartyFinancialPosition(partyId) {
    const pId = parseInt(partyId);
    if (isNaN(pId)) throw new Error("Invalid Party ID provided");

    const party = await prisma.party.findUnique({
      where: { id: pId },
      include: {
        saleTransactions: {
          where: { isDeleted: false, status: { not: "CANCELLED" } }
        },
        intakeAdvances: true,
        supplierInvoices: {
          where: { status: { not: "SUPERSEDED" } }
        },
        payments: {
          include: { allocations: true }
        }
      }
    });

    if (!party) throw new Error("Party not found");

    return PartyFinanceCalculator.calculatePosition({
      sales: party.saleTransactions,
      purchases: party.supplierInvoices,
      payments: party.payments,
      advances: party.intakeAdvances
    });
  }
}
