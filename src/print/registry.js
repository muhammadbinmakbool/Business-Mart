import IntakeReceiptTemplate from "./templates/IntakeReceiptTemplate";
import SaleInvoiceTemplate from "./templates/SaleInvoiceTemplate";
import SettlementInvoiceTemplate from "./templates/SettlementInvoiceTemplate";
import LedgerTemplate from "./templates/LedgerTemplate";

import {
  mapIntakeToPrintModel,
  mapSaleToPrintModel,
  mapSettlementToPrintModel,
  mapLedgerToPrintModel
} from "./mappers/dataMappers";

import {
  IntakePrintSchema,
  SalePrintSchema,
  SettlementPrintSchema,
  LedgerPrintSchema
} from "./schemas/printSchemas";

export const PRINT_REGISTRY = {
  intake: {
    versions: {
      1: {
        template: IntakeReceiptTemplate,
        mapper: mapIntakeToPrintModel,
        schema: IntakePrintSchema
      }
    },
    defaultVersion: 1,
    orientation: "portrait"
  },
  sale: {
    versions: {
      1: {
        template: SaleInvoiceTemplate,
        mapper: mapSaleToPrintModel,
        schema: SalePrintSchema
      }
    },
    defaultVersion: 1,
    orientation: "portrait"
  },
  settlement: {
    versions: {
      1: {
        template: SettlementInvoiceTemplate,
        mapper: mapSettlementToPrintModel,
        schema: SettlementPrintSchema
      }
    },
    defaultVersion: 1,
    orientation: "portrait"
  },
  ledger: {
    versions: {
      1: {
        template: LedgerTemplate,
        mapper: mapLedgerToPrintModel,
        schema: LedgerPrintSchema
      }
    },
    defaultVersion: 1,
    orientation: "landscape"
  }
};

/**
 * Resolves a template layout and mapped/validated data from the registry.
 */
export function resolvePrintTemplate(type, rawData, version = null, mapperArgs = []) {
  const config = PRINT_REGISTRY[type];
  if (!config) {
    throw new Error(`Print template type "${type}" is not registered.`);
  }

  const v = version || config.defaultVersion;
  const versionConfig = config.versions[v];
  if (!versionConfig) {
    throw new Error(`Version "${v}" for template type "${type}" is not registered.`);
  }

  // 1. Map data
  const mappedData = versionConfig.mapper(rawData, ...mapperArgs);

  // 2. Validate using Zod schema
  if (versionConfig.schema) {
    const result = versionConfig.schema.safeParse(mappedData);
    if (!result.success) {
      console.error(`[Print Validation Error] Schema validation failed for "${type}" v${v}:`, result.error.format());
      throw new Error(`Print schema validation failed for "${type}" v${v}. See console log for missing/invalid properties.`);
    }
  }

  return {
    Component: versionConfig.template,
    mappedData,
    orientation: config.orientation,
    version: v
  };
}
