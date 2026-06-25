import { prisma } from "@/lib/prisma";
import { getCached, setCached } from "./cache";

/**
 * Domain Aggregator: Supplier Invoices / Settlements
 * Assembles and caches setup metrics and uninvoiced items needed for Supplier Settlements.
 */
export async function getSupplierSettlementSetup() {
  const cacheKey = "settlement_setup";
  const cached = getCached("supplier", cacheKey);
  if (cached) {
    return cached;
  }

  // Query active suppliers (SUPPLIER or BOTH) with pending settlements (sold/partial uninvoiced intakes or unlinked advances)
  const suppliers = await prisma.party.findMany({
    where: {
      isActive: true,
      isDeleted: false,
      AND: [
        {
          OR: [
            { partyType: "SUPPLIER" },
            { partyType: "BOTH" }
          ]
        },
        {
          OR: [
            {
              intakeTransactions: {
                some: {
                  isDeleted: false,
                  status: { in: ["SOLD", "PARTIAL"] },
                  OR: [
                    {
                      invoiceItems: {
                        none: {
                          invoice: {
                            status: { not: "SUPERSEDED" }
                          }
                        }
                      }
                    },
                    {
                      salesTracks: {
                        some: {
                          isSettled: false
                        }
                      }
                    }
                  ]
                }
              }
            },
            {
              intakeAdvances: {
                some: {
                  supplierInvoiceId: null
                }
              }
            }
          ]
        }
      ]
    },
    orderBy: { name: "asc" }
  });

  const settingsRecord = await prisma.systemSetting.findUnique({
    where: { key: "adjustment_visibility" }
  });
  const settings = settingsRecord ? JSON.parse(settingsRecord.value) : { adjustmentVisibility: {} };

  const data = {
    suppliers: JSON.parse(JSON.stringify(suppliers)),
    settings
  };

  // Cache for 30 seconds
  setCached("supplier", cacheKey, data, 30 * 1000);

  return data;
}

/**
 * Fetches uninvoiced intakes and advances for a specific supplier.
 * Cache is bucketed under "supplier" and key includes the partyId.
 */
export async function getUninvoicedSupplierData(partyId) {
  const cacheKey = `uninvoiced_${partyId}`;
  const cached = getCached("supplier", cacheKey);
  if (cached) {
    return cached;
  }

  const { IntakeService } = await import("@/modules/intake/services/IntakeService");
  const { AdvanceRepository } = await import("@/modules/intake/repositories/AdvanceRepository");

  const [intakes, advances] = await Promise.all([
    IntakeService.listUninvoicedIntakes(partyId),
    AdvanceRepository.getUnlinkedByPartyId(partyId)
  ]);

  const data = {
    intakes: JSON.parse(JSON.stringify(intakes)),
    advances: JSON.parse(JSON.stringify(advances))
  };

  // Cache for 30 seconds
  setCached("supplier", cacheKey, data, 30 * 1000);

  return data;
}
