import { DOCUMENT_CONFIG } from "../config/documentConfig";

/**
 * PRINT SUBSYSTEM BRANDING RULES
 * 
 * Maps branding information dynamically to the master documentConfig.
 */
export const PRINT_BRANDING = {
  name: DOCUMENT_CONFIG.companyName,
  address: DOCUMENT_CONFIG.companyAddress,
  phone: DOCUMENT_CONFIG.companyPhone,
  email: DOCUMENT_CONFIG.companyEmail,
  logo: null, // Hook for future logo URLs/base64 strings
  watermarkText: DOCUMENT_CONFIG.watermarkText,
  showWatermark: DOCUMENT_CONFIG.showWatermark,
};
