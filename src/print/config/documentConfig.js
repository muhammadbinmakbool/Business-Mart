// Document Subsystem Configuration

export const DOCUMENT_CONFIG = {
  companyName: "Rehmania & Company",
  companyAddress: "Grain Market, Rahim Yar Khan, Punjab, Pakistan",
  companyPhone: "0301-6782024",
  companyEmail: "info@rehmania-grain.com",
  defaultCurrency: "Rs.",
  showWatermark: true,
  watermarkText: "REHMANIA",
  paperSize: "A4",
  systemVersion: "v1.0",
  // New default settings
  defaultTemplate: "STANDARD",
  orientation: "PORTRAIT",
  showLogo: true,
  showSignatures: true,
  showDuplicateLabel: true,
  footerNotes: "",
  autoPrintAfterSave: false
};

/**
 * Merges saved database settings with default document config parameters.
 * Enforces strict priority hierarchy:
 * 1. General Settings (Company Profile, branding defaults - Identity Layer)
 * 2. Print Settings (Layout templates, sizes, visible sections - Presentation Layer)
 * 3. Hardcoded defaults (DOCUMENT_CONFIG)
 * 
 * Keeps print subsystem utilities database-agnostic.
 * 
 * @param {object} printSettings - Print/Layout preferences
 * @param {object} generalSettings - Company/Branding profile settings
 */
export function getMergedDocumentConfig(printSettings, generalSettings) {
  let ps = printSettings || {};
  let gs = generalSettings || {};
  
  // Backward compatibility: if only one argument is provided which contains merged data
  if (!generalSettings && printSettings && (printSettings.businessName || printSettings.logoPath || printSettings.currencySymbol)) {
    gs = printSettings;
  }

  return {
    ...DOCUMENT_CONFIG,
    
    // 1. Identity Layer (Source of Truth: General Settings)
    companyName: gs.businessName || DOCUMENT_CONFIG.companyName,
    companyPhone: gs.phoneNumber || DOCUMENT_CONFIG.companyPhone,
    companyAddress: gs.address || DOCUMENT_CONFIG.companyAddress,
    companyEmail: gs.businessEmail || DOCUMENT_CONFIG.companyEmail,
    logoUrl: gs.logoPath || DOCUMENT_CONFIG.logoUrl || "",
    currencyCode: gs.currencyCode || "PKR",
    defaultCurrency: gs.currencySymbol || DOCUMENT_CONFIG.defaultCurrency,
    decimalPlaces: gs.decimalPlaces !== undefined ? parseInt(gs.decimalPlaces) : 2,
    dateFormat: gs.dateFormat || "DD/MM/YYYY",

    // 2. Presentation Layer (Layout overrides: Print Settings)
    defaultTemplate: ps.defaultTemplate || DOCUMENT_CONFIG.defaultTemplate,
    paperSize: ps.paperSize || DOCUMENT_CONFIG.paperSize,
    orientation: ps.orientation || DOCUMENT_CONFIG.orientation,
    showLogo: ps.showLogo !== undefined ? ps.showLogo : DOCUMENT_CONFIG.showLogo,
    showWatermark: ps.showWatermark !== undefined ? ps.showWatermark : DOCUMENT_CONFIG.showWatermark,
    showSignatures: ps.showSignatures !== undefined ? ps.showSignatures : DOCUMENT_CONFIG.showSignatures,
    showDuplicateLabel: ps.showDuplicateLabel !== undefined ? ps.showDuplicateLabel : DOCUMENT_CONFIG.showDuplicateLabel,
    footerNotes: ps.footerNotes !== undefined ? ps.footerNotes : DOCUMENT_CONFIG.footerNotes,
    autoPrintAfterSave: ps.autoPrintAfterSave !== undefined ? ps.autoPrintAfterSave : DOCUMENT_CONFIG.autoPrintAfterSave,
  };
}
