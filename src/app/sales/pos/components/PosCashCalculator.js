"use client";

import React, { useRef, useEffect } from "react";
import { Coins, CheckCircle, AlertTriangle } from "lucide-react";
import { round } from "@/lib/financial";
import { useSettings } from "@/components/layout/SettingsContext";
import { formatNumber } from "@/lib/formatters/financialFormatter";

export default function PosCashCalculator({
  finalAmount = 0,
  cashReceived = "",
  onChangeCashReceived,
  calculatorRef
}) {
  const { decimalPlaces, currencySymbol } = useSettings();
  const parsedCash = parseFloat(cashReceived) || 0;
  const changeDue = parsedCash - finalAmount;

  // Quick cash addition buttons
  const quickCashOptions = [
    { label: "Exact", value: finalAmount },
    { label: "+100", value: parsedCash + 100 },
    { label: "+500", value: parsedCash + 500 },
    { label: "+1000", value: parsedCash + 1000 },
    { label: "+5000", value: parsedCash + 5000 }
  ];

  const handleQuickAdd = (val) => {
    // If it's a relative addition, or absolute (Exact)
    const exactVal = Math.max(0, round(val));
    onChangeCashReceived(exactVal.toString());
  };

  return (
    <div className="bg-card border border-border/60 rounded-xl p-3 shadow-sm backdrop-blur-md flex flex-col justify-between h-full">
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5 border-b border-border/40 pb-1.5">
          <Coins className="h-3.5 w-3.5 text-primary" />
          Cash Calculator (F3)
        </h3>

        {/* Input Cash Received */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Cash Received</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-sm">PKR</span>
            <input
              ref={calculatorRef}
              id="cashReceived"
              type="number"
              step="any"
              placeholder="0.00"
              value={cashReceived}
              onFocus={(e) => e.target.select()}
              onChange={(e) => onChangeCashReceived(e.target.value)}
              className="w-full bg-background border border-border hover:border-muted-foreground/30 focus:border-primary rounded-xl pl-11 pr-3 py-1 font-mono font-bold text-base text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>

        {/* Quick Denominations */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {quickCashOptions.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleQuickAdd(opt.value)}
              className="flex-1 min-w-[55px] text-center text-[10px] font-bold py-1 px-1 rounded bg-muted hover:bg-accent border hover:border-muted-foreground/25 text-foreground transition-all duration-150 cursor-pointer"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Change Due Display */}
      <div className="mt-2">
        {cashReceived === "" ? (
          <div className="bg-muted/40 border border-dashed rounded-lg p-2 text-center text-[10px] text-muted-foreground italic">
            Enter cash received to compute change.
          </div>
        ) : changeDue >= 0 ? (
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-2 flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-green-600 block">Change Due</span>
              <span className="text-sm font-bold font-mono text-green-500 truncate block">
                {currencySymbol} {formatNumber(changeDue, "en", decimalPlaces)}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2 flex items-center gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 block">Short / Balance Due</span>
              <span className="text-sm font-bold font-mono text-amber-500 truncate block">
                {currencySymbol} {formatNumber(Math.abs(changeDue), "en", decimalPlaces)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
