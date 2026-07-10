"use client";

import React from "react";
import { ArrowRight, Lightbulb, Check, Lock, AlertCircle } from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { formatUnitDisplay } from "@/lib/formatters/unitFormatter";
import { formatCurrency } from "@/lib/formatters/financialFormatter";

/**
 * Reusable, presentational UI component for rendering suggested draft invoices.
 * Supports compact layouts (for POS billing), multi-select item toggling (for Sales Workbench),
 * and quick-prefill interactions (for create form headers).
 */
export default function DraftSuggestionCard({
  draftSuggestion,
  onApply,
  onToggleItemSelection = null,
  selectedItemIds = null,
  isCompact = false,
  buttonText = "Apply Prefill",
  settings = null,
  currencySymbol = "Rs.",
  decimalPlaces = 2
}) {
  if (!draftSuggestion || !draftSuggestion.items || draftSuggestion.items.length === 0) {
    return null;
  }

  const items = draftSuggestion.items;
  const isSelectable = typeof onToggleItemSelection === "function" && selectedItemIds instanceof Set;
  const hasWeightPending = items.some(i => i.isWeightRecorded === false);
  
  // Compact POS Style Card
  if (isCompact) {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
        <div className="flex items-start gap-2.5">
          <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-foreground">
              Intelligent Draft Invoice Available
              {hasWeightPending && (
                <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200/50 uppercase ml-2">
                  <AlertCircle className="h-3 w-3" />
                  Weight Pending
                </span>
              )}
            </h4>
            <p className="text-[10px] text-muted-foreground">We matched unbilled intakes or direct purchase history patterns for this buyer.</p>
          </div>
        </div>
        <button
          type="button"
          disabled={hasWeightPending}
          onClick={() => {
            if (hasWeightPending) {
              showToast.error("This draft contains items with pending weight calculations. Please finalize weight details first.");
              return;
            }
            onApply(draftSuggestion);
          }}
          className="shrink-0 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground text-[10.5px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer self-start md:self-center flex items-center gap-1"
        >
          {hasWeightPending ? "Weight Pending" : `${buttonText} (${items.length} Items)`}
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // Large/Standard Style Card (used in Classic SaleForm & Sales Workbench)
  return (
    <div className="border rounded-2xl bg-card/60 backdrop-blur-md overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
      {/* Card Header (only if not selectable, i.e., in Classic Form) */}
      {!isSelectable && (
        <div className="bg-primary/5 border-b border-primary/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Intelligent Draft Suggestion Available
                {hasWeightPending && (
                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200/50 uppercase ml-2">
                    <AlertCircle className="h-3 w-3" />
                    Weight Pending
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-muted-foreground">We found unbilled intakes or recurring purchase patterns for this buyer.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={hasWeightPending}
            onClick={() => onApply(draftSuggestion)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer self-start sm:self-center shadow-sm flex items-center gap-1.5"
          >
            {hasWeightPending ? "Weight Pending" : `${buttonText} (${items.length} Items)`}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Suggestion Lines Grid */}
      <div className="divide-y divide-border/60">
        {items.map(item => {
          const isSelected = isSelectable ? selectedItemIds.has(item.id) : true;
          const isWeightPending = item.isWeightRecorded === false;
          
          return (
            <div
              key={item.id}
              onClick={() => {
                if (isWeightPending) {
                  showToast.error("This item has a pending weight calculation. Please finalize the weight in the Intake module first.");
                  return;
                }
                if (isSelectable) onToggleItemSelection(draftSuggestion.buyerId, item.id);
              }}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                isSelectable && !isWeightPending ? "hover:bg-muted/10 cursor-pointer" : "bg-background/40"
              } ${isWeightPending ? "opacity-75" : ""}`}
            >
              {isSelectable && (
                isWeightPending ? (
                  <div className="mt-0.5 h-4 w-4 flex items-center justify-center shrink-0 text-muted-foreground" title="Weight Pending">
                    <Lock className="h-3.5 w-3.5 text-rose-500" />
                  </div>
                ) : (
                  <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                    isSelected 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "border-gray-300 dark:border-gray-700 bg-background"
                  }`}>
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                )
              )}
              
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-foreground flex items-center gap-1">
                    {item.productName}
                    {isWeightPending && (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-200/50 uppercase tracking-wider shrink-0">
                        <AlertCircle className="h-3 w-3" />
                        Weight Pending
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {isWeightPending ? (
                      <span className="text-rose-600 font-normal italic">Pending</span>
                    ) : (
                      formatUnitDisplay(Number(item.weight), item.unit, null, "en", null, settings)
                    )}
                    {" "}@ {formatCurrency(item.rate, "en", currencySymbol, decimalPlaces)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-[11px] mt-0.5">
                  <span className="text-muted-foreground italic">
                    {item.rationale}
                  </span>
                  
                  {item.type === "TRACKED" ? (
                    <span className="text-xs text-primary font-bold">100% Match</span>
                  ) : (
                    <span className={`text-xs font-bold ${
                      item.confidence >= 0.8 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-amber-600 dark:text-amber-400"
                    }`}>
                      {Math.round(item.confidence * 100)}% Confidence
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
