import { DOCUMENT_CONFIG } from "../config/documentConfig";

/**
 * PRINT SUBSYSTEM GLOBAL CONFIGURATION
 * 
 * Controls margins, default values, watermarks, paper sizes, and scaling factor configurations.
 */
export const PRINT_CONFIG = {
  paperSize: DOCUMENT_CONFIG.paperSize || "A4",
  defaultCurrency: DOCUMENT_CONFIG.defaultCurrency || "Rs.",
  systemVersion: DOCUMENT_CONFIG.systemVersion || "v1.0",
  margins: {
    portrait: "15mm 12mm 15mm 12mm",
    landscape: "10mm",
  },
  scaling: {
    html2canvasScale: 2,
    quality: 0.98,
  },
  watermark: {
    show: DOCUMENT_CONFIG.showWatermark,
    text: DOCUMENT_CONFIG.watermarkText || "REHMANIA",
  },
  footer: {
    show: true,
    printedAt: true,
    systemVersion: true,
  }
};
