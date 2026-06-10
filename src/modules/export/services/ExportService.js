import { prisma } from "@/lib/prisma";
import { filterSales } from "@/modules/sales/utils/salesFilters";
import { filterInvoices } from "@/modules/supplier-invoices/utils/invoiceFilters";
import { filterSessions } from "@/modules/ledger/utils/ledgerFilters";

export class ExportService {
  /**
   * Fetches and filters the raw data for a given resource in a pagination-safe manner.
   * Chunks database queries in 1000-record batches to prevent server memory exhaustion.
   * 
   * @param {string} resource - 'sales', 'settlements', or 'ledger'
   * @param {Object} filters - Active query filter parameters
   * @returns {Promise<Array>} List of filtered database records
   */
  static async getExportDataset(resource, filters = {}) {
    switch (resource) {
      case "sales": {
        let allFilteredSales = [];
        let skip = 0;
        const pageSize = 1000;
        let hasMore = true;

        let whereClause = { isDeleted: false };
        try {
          const { getActivityAuditSettings } = await import("@/lib/settings/activityAuditSettings");
          const settings = await getActivityAuditSettings();
          if (settings.showDeletedRecords) {
            whereClause = {};
          }
        } catch (error) {
          console.error("ExportService: Failed to load activity audit settings, falling back to isDeleted = false:", error);
        }

        while (hasMore) {
          const rawSales = await prisma.saleTransaction.findMany({
            include: {
              party: true,
              items: {
                include: { product: true }
              }
            },
            where: whereClause,
            orderBy: { createdAt: "desc" },
            take: pageSize,
            skip: skip
          });

          if (rawSales.length === 0) {
            hasMore = false;
            break;
          }

          const plainSales = JSON.parse(JSON.stringify(rawSales));
          const filteredChunk = filterSales(plainSales, filters);
          allFilteredSales.push(...filteredChunk);

          if (rawSales.length < pageSize) {
            hasMore = false;
          } else {
            skip += pageSize;
          }
        }

        return allFilteredSales;
      }
      
      case "settlements": {
        let allFilteredSettlements = [];
        let skip = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const rawSettlements = await prisma.supplierInvoice.findMany({
            where: { isDeleted: false },
            include: { party: true },
            orderBy: { createdAt: "desc" },
            take: pageSize,
            skip: skip
          });

          if (rawSettlements.length === 0) {
            hasMore = false;
            break;
          }

          const plainSettlements = JSON.parse(JSON.stringify(rawSettlements));
          const filteredChunk = filterInvoices(plainSettlements, filters);
          allFilteredSettlements.push(...filteredChunk);

          if (rawSettlements.length < pageSize) {
            hasMore = false;
          } else {
            skip += pageSize;
          }
        }

        return allFilteredSettlements;
      }
      
      case "ledger": {
        let allFilteredSessions = [];
        let skip = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const rawSessions = await prisma.ledgerSession.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: "desc" },
            take: pageSize,
            skip: skip
          });

          if (rawSessions.length === 0) {
            hasMore = false;
            break;
          }

          const plainSessions = JSON.parse(JSON.stringify(rawSessions));
          const filteredChunk = filterSessions(plainSessions, filters);
          allFilteredSessions.push(...filteredChunk);

          if (rawSessions.length < pageSize) {
            hasMore = false;
          } else {
            skip += pageSize;
          }
        }

        return allFilteredSessions;
      }
      
      default:
        throw new Error(`Unsupported export resource: "${resource}"`);
    }
  }
}
