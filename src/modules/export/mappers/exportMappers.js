import { exportSchemas } from "../schemas/exportSchemas";

/**
 * Maps a single raw database record into a flat, display-ready export object
 * according to the provided schema definition.
 * 
 * @param {Object} record - The database record
 * @param {Object} schema - The schema configuration object containing columns
 * @returns {Object} Flat mapped object with column headers as keys
 */
export function mapRecordToSchema(record, schema) {
  const mapped = {};
  for (const col of schema.columns) {
    let rawVal;
    if (col.key.includes(".")) {
      const parts = col.key.split(".");
      rawVal = record;
      for (const p of parts) {
        rawVal = rawVal ? rawVal[p] : undefined;
      }
    } else {
      rawVal = record[col.key];
    }
    
    if (col.format) {
      mapped[col.header] = col.format(rawVal, record);
    } else {
      mapped[col.header] = rawVal;
    }
  }
  return mapped;
}

export function mapSaleToExportModel(sale) {
  return mapRecordToSchema(sale, exportSchemas.sales);
}

export function mapSettlementToExportModel(settlement) {
  return mapRecordToSchema(settlement, exportSchemas.settlements);
}

export function mapLedgerToExportModel(session) {
  return mapRecordToSchema(session, exportSchemas.ledger);
}
