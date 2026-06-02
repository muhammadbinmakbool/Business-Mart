import React from "react";
import { PRINT_BRANDING } from "../theme/branding";
import { PRINT_CONFIG } from "../theme/printConfig";
import { t } from "../localization/locale";
import { getMergedDocumentConfig } from "../config/documentConfig";

export default function BasePrintLayout({
  title,
  documentId,
  date,
  status,
  showWatermark = null,
  landscape = false,
  locale = "en",
  config = null,
  children
}) {
  const isRTL = locale === "ur";
  const activeConfig = getMergedDocumentConfig(config);

  const displayWatermark = showWatermark !== null ? showWatermark : activeConfig.showWatermark;

  return (
    <div className="print-page" dir={isRTL ? "rtl" : "ltr"}>
      <div className={`print-container p-6 ${landscape ? "print-landscape" : ""}`}>
        {/* Watermark */}
        {displayWatermark && (
          <div className="print-watermark">
            {activeConfig.watermarkText}
          </div>
        )}

        {/* Header Grid */}
        <div className="flex justify-between items-start border-b pb-4 mb-6 relative z-10 rtl:flex-row-reverse">
          <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse text-right" : "text-left"}`}>
            {activeConfig.showLogo && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white font-black text-lg select-none">
                B
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
                {activeConfig.companyName}
              </h1>
              <p className="text-[10px] text-slate-500 max-w-sm mt-0.5 leading-relaxed">
                {activeConfig.companyAddress}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {t("companyPhone", locale)}: {activeConfig.companyPhone} | {t("companyEmail", locale)}: {activeConfig.companyEmail}
              </p>
            </div>
          </div>
          <div className={isRTL ? "text-left" : "text-right"}>
            <div className="text-lg font-black text-slate-700 tracking-wider uppercase bg-slate-100 px-3 py-1 rounded">
              {title}
            </div>
            {activeConfig.showDuplicateLabel && (
              <div className="mt-1 text-[9px] font-extrabold tracking-widest text-slate-400 uppercase">
                * {t("duplicateCopy", locale)} *
              </div>
            )}
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

        {/* Signatures Section */}
        {activeConfig.showSignatures && (
          <div className="mt-12 pt-8 grid grid-cols-2 gap-8 border-t border-dashed text-xs text-slate-500 font-medium no-break rtl:flex-row-reverse">
            <div className="text-center">
              <div className="border-t border-slate-300 w-48 mx-auto mt-8 pt-2">
                {t("preparedBy", locale)}
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-300 w-48 mx-auto mt-8 pt-2">
                {t("authorizedSignature", locale)}
              </div>
            </div>
          </div>
        )}

        {/* Footer Notes */}
        {activeConfig.footerNotes && (
          <div className="mt-8 text-center text-xs text-slate-500 italic font-medium no-break">
            {activeConfig.footerNotes}
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-4 mt-8 flex justify-between items-center text-[9px] text-slate-400 font-mono no-break relative z-10 rtl:flex-row-reverse">
          <div>
            {t("systemLabel", locale)} {activeConfig.systemVersion} | {t("templateLabel", locale)}: v1.0
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


