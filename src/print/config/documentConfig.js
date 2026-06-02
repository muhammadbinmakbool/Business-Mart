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
 * Keeps print subsystem utilities database-agnostic.
 */
export function getMergedDocumentConfig(settings) {
  if (!settings) return DOCUMENT_CONFIG;
  return {
    ...DOCUMENT_CONFIG,
    defaultTemplate: settings.defaultTemplate || DOCUMENT_CONFIG.defaultTemplate,
    paperSize: settings.paperSize || DOCUMENT_CONFIG.paperSize,
    orientation: settings.orientation || DOCUMENT_CONFIG.orientation,
    showLogo: settings.showLogo !== undefined ? settings.showLogo : DOCUMENT_CONFIG.showLogo,
    showWatermark: settings.showWatermark !== undefined ? settings.showWatermark : DOCUMENT_CONFIG.showWatermark,
    showSignatures: settings.showSignatures !== undefined ? settings.showSignatures : DOCUMENT_CONFIG.showSignatures,
    showDuplicateLabel: settings.showDuplicateLabel !== undefined ? settings.showDuplicateLabel : DOCUMENT_CONFIG.showDuplicateLabel,
    footerNotes: settings.footerNotes !== undefined ? settings.footerNotes : DOCUMENT_CONFIG.footerNotes,
    defaultCurrency: settings.defaultCurrency || DOCUMENT_CONFIG.defaultCurrency,
    autoPrintAfterSave: settings.autoPrintAfterSave !== undefined ? settings.autoPrintAfterSave : DOCUMENT_CONFIG.autoPrintAfterSave
  };
}

