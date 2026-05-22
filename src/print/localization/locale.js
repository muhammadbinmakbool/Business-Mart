/**
 * PRINT SUBSYSTEM TRANSLATIONS AND LOCALIZATION
 * 
 * Supports English and Urdu (RTL) locales dynamically.
 */
export const DOC_DICTIONARY = {
  en: {
    // General
    companyPhone: "Phone",
    companyEmail: "Email",
    printedAt: "Printed At",
    systemLabel: "System: Business Mart",
    templateLabel: "Template",
    pageLabel: "Page",
    ofLabel: "of",
    date: "Date",
    no: "No",

    // Intake Receipt
    intakeTitle: "Goods Intake Receipt",
    supplierInfo: "Supplier Info",
    receiptDetails: "Receipt Details",
    intakeDate: "Intake Date",
    systemTime: "System Time",
    productName: "Product Name",
    grossWeight: "Gross Weight",
    bags: "Bags",
    deductionMethod: "Deduction Method",
    stdRefraction: "Standard Refraction",
    soldSummary: "Outward Sale & Refraction Summary",
    buyerParty: "Buyer Party",
    measurementsRate: "Measurements & Rate",
    netWeightBilled: "Net Weight (Billed)",
    sellingRate: "Selling Rate",
    totalBaseValue: "Total Base Value",
    bardanaLabel: "Bardana (Tare Weight)",
    khotLabel: "Khot (Impurity Deduction)",
    internalNotes: "Internal Notes",

    // Sale Invoice
    saleTitle: "Sale Invoice",
    billedTo: "Billed To (Buyer)",
    invoiceSummary: "Invoice Summary",
    invoiceDate: "Invoice Date",
    rate: "Rate",
    amount: "Amount",
    adjustmentsTitle: "Billing Adjustments & Fees",
    adjustmentType: "Fee/Discount Type",
    calcMethod: "Calculation Method",
    calculated: "Calculated",
    baseTotalVal: "Base Total Value",
    totalAdjs: "Total Adjustments",
    totalNetWeight: "Total Net Weight",
    finalInvTotal: "Final Invoice Total",
    internalInvNotes: "Internal Invoice Notes",

    // Settlement Invoice
    settlementTitle: "Supplier Settlement Invoice",
    settledWith: "Settled With (Supplier)",
    settlementVersionInfo: "Settlement Version Info",
    invoiceVersion: "Invoice Version",
    generated: "Generated",
    outdatedWarning: "Outdated: Underlying records modified",
    invoicedGoodsIntakes: "Invoiced Goods Intakes",
    intakeProduct: "Intake / Product",
    grossValue: "Gross Value",
    intakeDeductions: "Intake Deductions",
    netIntake: "Net Intake",
    overallAdjustmentsSummary: "Overall Billing Adjustments Summary",
    deductionAdditionType: "Deduction / Addition Type",
    formulaRules: "Formula Rules",
    totalApplied: "Total Applied",
    advancesDeductedRepaid: "Advances Deducted / Repaid",
    advanceAdjusted: "Advance Adjusted",
    totalGrossValue: "Total Gross Value",
    totalDeductions: "Total Deductions",
    advancesDeducted: "Advances Deducted",
    netPayableAmount: "Net Payable Amount",

    // Ledger
    auditPeriod: "Audit Period",
    activeFilters: "Active Filters",
    supplier: "Supplier",
    buyer: "Buyer",
    reportGenerated: "Report Generated",
    driftDetected: "DRIFT DETECTED IN SAVED SNAPSHOT",
    driftDescription: "One or more underlying transactions have been modified since this session was closed. Below is the discrepancy:",
    discrepancyCategory: "Discrepancy Category",
    savedValue: "Saved Value",
    liveValue: "Live Current Value",
    difference: "Difference",
    supplierSettlementsInward: "Supplier Settlements (Inward)",
    buyerBillingOutward: "Buyer Billing (Outward)",
    reconciliationBalanced: "Monthly Reconciliation Balanced",
    reconciliationMismatch: "Reconciliation Mismatch Detected",
    reconciliationFormula: "Formula: Supplier Net Value + Supplier adjustments = Buyer Net Value - Buyer adjustments (Base equivalence matching).",
    driftDifference: "Discrepancy / Drift Difference",
    supplierSettlements: "Supplier Settlements",
    buyerSales: "Buyer Sales",
    netSettled: "Net Settled",
    netBilled: "Net Billed",
    noSupplierSettlements: "No supplier settlements",
    noBuyerSales: "No buyer sales"
  },
  ur: {
    companyPhone: "فون",
    companyEmail: "ای میل",
    printedAt: "پرنٹ کا وقت",
    systemLabel: "سستم: بزنس مارٹ",
    templateLabel: "ٹیمپلیٹ",
    pageLabel: "صفحہ",
    ofLabel: "کا",
    date: "تاریخ",
    no: "نمبر",

    intakeTitle: "آمدنی رسید (خرید)",
    supplierInfo: "تفصیلاتِ فراہم کنندہ",
    receiptDetails: "رسید کی تفصیلات",
    intakeDate: "وصولی کی تاریخ",
    systemTime: "سسٹم کا وقت",
    productName: "جنس کا نام",
    grossWeight: "کل وزن",
    bags: "بوریاں",
    deductionMethod: "کٹائی کا طریقہ",
    stdRefraction: "معیاری کٹائی",
    soldSummary: "فروخت اور کٹائی کا خلاصہ",
    buyerParty: "خریدار کی تفصیل",
    measurementsRate: "پیمائش اور ریٹ",
    netWeightBilled: "صاف وزن (بل شدہ)",
    sellingRate: "فروخت کا ریٹ",
    totalBaseValue: "کل بنیادی قیمت",
    bardanaLabel: "باردانہ (خالی بوری کا وزن)",
    khotLabel: "کھوٹ (ردی/کچرا کٹوتی)",
    internalNotes: "اندرونی ریمارکس",

    saleTitle: "سیل انوائس",
    billedTo: "بل بنام (خریدار)",
    invoiceSummary: "انوائس کا خلاصہ",
    invoiceDate: "انوائس کی تاریخ",
    rate: "ریٹ",
    amount: "رقم",
    adjustmentsTitle: "بلنگ کٹوتیاں اور اضافی چارجز",
    adjustmentType: "کٹاو/چھوٹ کی قسم",
    calcMethod: "حساب کا طریقہ",
    calculated: "حساب شدہ رقم",
    baseTotalVal: "کل بنیادی رقم",
    totalAdjs: "کل کٹوتیاں/اضافے",
    totalNetWeight: "کل صاف وزن",
    finalInvTotal: "حتمی انوائس کا ٹوٹل",
    internalInvNotes: "اندرونی انوائس ریمارکس",

    settlementTitle: "سپلائر تصفیہ انوائس",
    settledWith: "تصفیہ بنام (سپلائر)",
    settlementVersionInfo: "تصفیہ انوائس ورژن",
    invoiceVersion: "انوائس ورژن",
    generated: "تاریخ پیداوار",
    outdatedWarning: "انتباہ: بنیادی ریکارڈ تبدیل ہو چکا ہے",
    invoicedGoodsIntakes: "بل شدہ آمدنی رسیدیں",
    intakeProduct: "آمدنی رسید / جنس",
    grossValue: "کل کچی رقم",
    intakeDeductions: "آمدنی کٹوتیاں",
    netIntake: "صاف آمدنی رقم",
    overallAdjustmentsSummary: "مجموعی بلنگ کٹوتیوں کا خلاصہ",
    deductionAdditionType: "کٹوتی / اضافہ کی قسم",
    formulaRules: "فارمولہ قوانین",
    totalApplied: "کل لاگو شدہ",
    advancesDeductedRepaid: "پیشگی رقوم کی کٹوتی / ادائیگی",
    advanceAdjusted: "پیشگی ایڈجسٹمنٹ",
    totalGrossValue: "مجموعی کچی رقم",
    totalDeductions: "مجموعی کٹوتیاں",
    advancesDeducted: "منہا شدہ پیشگی رقوم",
    netPayableAmount: "قابلِ ادائیگی خالص رقم",

    auditPeriod: "آڈٹ کی مدت",
    activeFilters: "فعال فلٹرز",
    supplier: "فراہم کنندہ",
    buyer: "خریدار",
    reportGenerated: "رپورٹ تیار کی گئی",
    driftDetected: "محفوظ شدہ ریکارڈ میں تبدیلی پائی گئی",
    driftDescription: "بنیادی لین دین میں کچھ تبدیلیاں کی گئی ہیں۔ تفصیلی فرق درج ذیل ہے:",
    discrepancyCategory: "فرق کی قسم",
    savedValue: "محفوظ شدہ قیمت",
    liveValue: "لائیو موجودہ قیمت",
    difference: "فرق",
    supplierSettlementsInward: "فراہم کنندہ تصفیہ (آمد)",
    buyerBillingOutward: "خریدار بلنگ (نکاسی)",
    reconciliationBalanced: "ماہانہ مفاہمت متوازن ہے",
    reconciliationMismatch: "مفاہمت میں فرق پایا گیا",
    reconciliationFormula: "فارمولہ: سپلائر خالص رقم + سپلائر کٹوتیاں = خریدار خالص رقم - خریدار کٹوتیاں",
    driftDifference: "فرق کی رقم",
    supplierSettlements: "سپلائر تصفیہ جات",
    buyerSales: "خریدار فروخت",
    netSettled: "خالص تصفیہ",
    netBilled: "خالص بل",
    noSupplierSettlements: "کوئی سپلائر تصفیہ نہیں ہے",
    noBuyerSales: "کوئی خریدار فروخت نہیں ہے"
  }
};

/**
 * Returns translation for a given key, with fallback to English.
 */
export function t(key, locale = "en") {
  const normalizedLocale = locale === "ur" ? "ur" : "en";
  return DOC_DICTIONARY[normalizedLocale]?.[key] || DOC_DICTIONARY["en"][key] || key;
}

/**
 * Returns text direction (ltr/rtl) based on locale.
 */
export function getLocaleDirection(locale = "en") {
  return locale === "ur" ? "rtl" : "ltr";
}

/**
 * Returns whether locale is RTL.
 */
export function isRTL(locale = "en") {
  return locale === "ur";
}
