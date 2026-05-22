import React from "react";
import { PRINT_BRANDING } from "../theme/branding";
import { PRINT_CONFIG } from "../theme/printConfig";
import { t } from "../localization/locale";

export default function BasePrintLayout({
  title,
  documentId,
  date,
  status,
  showWatermark = PRINT_BRANDING.showWatermark,
  landscape = false,
  locale = "en",
  children
}) {
  const isRTL = locale === "ur";

  return (
    <div className="print-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className={`print-container p-6 ${landscape ? "print-landscape" : ""}`}>
        {/* Watermark */}
        {showWatermark && (
          <div className="print-watermark">
            {PRINT_BRANDING.watermarkText}
          </div>
        )}

        {/* Header Grid */}
        <div className="flex justify-between items-start border-b pb-4 mb-6 relative z-10 rtl:flex-row-reverse">
          <div className={isRTL ? "text-right" : "text-left"}>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
              {PRINT_BRANDING.name}
            </h1>
            <p className="text-[10px] text-slate-500 max-w-sm mt-0.5 leading-relaxed">
              {PRINT_BRANDING.address}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {t("companyPhone", locale)}: {PRINT_BRANDING.phone} | {t("companyEmail", locale)}: {PRINT_BRANDING.email}
            </p>
          </div>
          <div className={isRTL ? "text-left" : "text-right"}>
            <div className="text-lg font-black text-slate-700 tracking-wider uppercase bg-slate-100 px-3 py-1 rounded">
              {title}
            </div>
            {documentId && (
              <div className="text-xs font-mono font-bold text-slate-600 mt-2">
                {t("no", locale)}: {documentId}
              </div>
            )}
            {date && (
              <div className="text-[10px] text-slate-500 mt-0.5">
                {t("date", locale)}: {date}
              </div>
            )}
            {status && (
              <div className="mt-1.5">
                <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-slate-300 bg-slate-50 text-slate-700">
                  {status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Slot */}
        <div className="relative z-10 min-h-[400px]">
          {children}
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-8 flex justify-between items-center text-[9px] text-slate-400 font-mono no-break relative z-10 rtl:flex-row-reverse">
          <div>
            {t("systemLabel", locale)} {PRINT_CONFIG.systemVersion} | {t("templateLabel", locale)}: v1.0
          </div>
          <div>
            {t("printedAt", locale)}: {new Date().toLocaleString(locale === "ur" ? "ur-PK" : "en-US")}
          </div>
          <div>
            {t("pageLabel", locale)} 1 {t("ofLabel", locale)} 1
          </div>
        </div>
      </div>
    </div>
  );
}

