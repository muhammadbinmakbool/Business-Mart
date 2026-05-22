import React from "react";
import { DOCUMENT_CONFIG } from "../config/documentConfig";

export default function BasePrintLayout({
  title,
  documentId,
  date,
  status,
  showWatermark = DOCUMENT_CONFIG.showWatermark,
  landscape = false,
  children
}) {
  return (
    <div className={`print-container p-6 ${landscape ? "print-landscape" : ""}`}>
      {/* Watermark */}
      {showWatermark && (
        <div className="print-watermark">
          {DOCUMENT_CONFIG.watermarkText}
        </div>
      )}

      {/* Header Grid */}
      <div className="flex justify-between items-start border-b pb-4 mb-6 relative z-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase">
            {DOCUMENT_CONFIG.companyName}
          </h1>
          <p className="text-[10px] text-slate-500 max-w-sm mt-0.5 leading-relaxed">
            {DOCUMENT_CONFIG.companyAddress}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Phone: {DOCUMENT_CONFIG.companyPhone} | Email: {DOCUMENT_CONFIG.companyEmail}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-slate-700 tracking-wider uppercase bg-slate-100 px-3 py-1 rounded">
            {title}
          </div>
          {documentId && (
            <div className="text-xs font-mono font-bold text-slate-600 mt-2">
              No: {documentId}
            </div>
          )}
          {date && (
            <div className="text-[10px] text-slate-500 mt-0.5">
              Date: {date}
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
      <div className="border-t pt-4 mt-8 flex justify-between items-center text-[9px] text-slate-400 font-mono no-break relative z-10">
        <div>
          System: Business Mart {DOCUMENT_CONFIG.systemVersion} | Template: v1.0
        </div>
        <div>
          Printed At: {new Date().toLocaleString()}
        </div>
        <div>
          Page 1 of 1
        </div>
      </div>
    </div>
  );
}
