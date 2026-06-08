"use client";

import React from "react";
import { Printer, Download } from "lucide-react";
import { triggerPrint, triggerDownloadPDF } from "../utils/printUtils";

export default function PrintButtons({ type, data, filename, locale = "en", className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => triggerPrint(type, data, locale)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-accent transition-colors font-medium text-sm text-foreground bg-background cursor-pointer shrink-0"
        title="Print Document"
      >
        <Printer className="h-4 w-4 text-slate-500" />
        <span>Print</span>
      </button>
      <button
        onClick={() => triggerDownloadPDF(type, data, filename, locale)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-accent transition-colors font-medium text-sm text-foreground bg-background cursor-pointer shrink-0"
        title="Download PDF"
      >
        <Download className="h-4 w-4 text-slate-500" />
        <span>Download PDF</span>
      </button>
    </div>
  );
}
