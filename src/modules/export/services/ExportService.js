import { SaleRepository } from "@/modules/sales/repositories/SaleRepository";
import { SupplierInvoiceRepository } from "@/modules/supplier-invoices/repositories/SupplierInvoiceRepository";
import { LedgerService } from "@/modules/ledger/services/LedgerService";
import { filterSales } from "@/modules/sales/utils/salesFilters";
import { filterInvoices } from "@/modules/supplier-invoices/utils/invoiceFilters";
import { filterSessions } from "@/modules/ledger/utils/ledgerFilters";

export class ExportService {
  /**
   * Fetches and filters the raw data for a given resource.
   * Both database fetching and shared client-server filters are integrated here.
   * 
   * @param {string} resource - 'sales', 'settlements', or 'ledger'
   * @param {Object} filters - Active query filter parameters
   * @returns {Promise<Array>} List of filtered database records
   */
  static async getExportDataset(resource, filters = {}) {
    switch (resource) {
      case "sales": {
        // Fetch raw sales records (with party and items/product included to avoid N+1)
        const rawSales = await SaleRepository.getAll();
        
        // Convert Prisma decimals/dates safely to plain JS structures
        const plainSales = JSON.parse(JSON.stringify(rawSales));
        
        // Apply shared filtering logic
        return filterSales(plainSales, filters);
      }
      
      case "settlements": {
        // Fetch raw settlements (supplier invoices)
        const rawSettlements = await SupplierInvoiceRepository.getAll();
        
        const plainSettlements = JSON.parse(JSON.stringify(rawSettlements));
        
        // Apply shared filtering logic
        return filterInvoices(plainSettlements, filters);
      }
      
      case "ledger": {
        // Fetch saved ledger reconciliation snapshots
        const rawSessions = await LedgerService.listSessions();
        
        const plainSessions = JSON.parse(JSON.stringify(rawSessions));
        
        // Apply shared filtering logic
        return filterSessions(plainSessions, filters);
      }
      
      default:
        throw new Error(`Unsupported export resource: "${resource}"`);
    }
  }
}
