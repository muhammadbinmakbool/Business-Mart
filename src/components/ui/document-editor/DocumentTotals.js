"use client";

import React from "react";
import { useSettings } from "@/components/layout/SettingsContext";
import { formatCurrency } from "@/lib/formatters/financialFormatter";

/**
 * DocumentTotals Component
 * Pure presentation card for base amount, adjustments, and final payable total.
 */
export default function DocumentTotals({
  baseAmount = 0,
  adjustmentsTotal = 0,
  grandTotal = 0,
}) {
  const { decimalPlaces, currencySymbol } = useSettings();

  return (
    <div className="rounded-2xl border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden p-6 space-y-4">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-3">
        Document Summary
      </h3>

      <div className="space-y-2.5 text-sm">
        {/* Base / Gross Amount */}
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Base Amount</span>
          <span className="font-mono font-semibold">
            {formatCurrency(baseAmount, "en", currencySymbol, decimalPlaces)}
          </span>
        </div>

        {/* Adjustments (if any) */}
        {adjustmentsTotal !== 0 && (
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Surcharges / Adjustments</span>
            <span className={`font-mono font-semibold ${adjustmentsTotal < 0 ? "text-rose-500" : "text-emerald-500"}`}>
              {adjustmentsTotal > 0 ? "+" : ""}
              {formatCurrency(adjustmentsTotal, "en", currencySymbol, decimalPlaces)}
            </span>
          </div>
        )}

        {/* Final Grand Total */}
        <div className="flex justify-between items-baseline border-t pt-3 mt-1.5">
          <span className="font-bold text-foreground text-xs uppercase tracking-wider">
            Total Payable
          </span>
          <span className="font-mono font-black text-xl text-primary">
            {formatCurrency(grandTotal, "en", currencySymbol, decimalPlaces)}
          </span>
        </div>
      </div>
    </div>
  );
}
