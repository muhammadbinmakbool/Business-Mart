"use client";

import React, { useState } from "react";
import { Plus, Trash2, Tag, Percent, DollarSign, Scale, Archive, X } from "lucide-react";
import { round } from "@/lib/financial";

export default function PosTotals({
  totals = { baseAmount: 0, totalWeight: 0, totalAdjustments: 0, finalAmount: 0, totalBagCount: 0 },
  adjustments = [],
  onAddAdjustment,
  onRemoveAdjustment,
  visibleAdjustmentTypes = [],
  notes = "",
  onChangeNotes
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newAdj, setNewAdj] = useState({
    adjustmentType: visibleAdjustmentTypes[0] || "Commission",
    method: "PERCENTAGE",
    value: "",
    direction: "ADD",
    unit: "KG"
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newAdj.value || isNaN(parseFloat(newAdj.value))) return;
    
    onAddAdjustment({
      adjustmentType: newAdj.adjustmentType,
      method: newAdj.method,
      value: parseFloat(newAdj.value),
      direction: newAdj.direction,
      unit: newAdj.method === "PER_WEIGHT" ? newAdj.unit : null
    });
    
    setNewAdj({
      ...newAdj,
      value: ""
    });
    setShowAdd(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-card border border-border/60 rounded-xl p-3 shadow-sm backdrop-blur-md">
      {/* Left Column: Active Adjustments & Add Adjustment */}
      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-primary" />
            Invoice Adjustments
          </h3>
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200"
          >
            <Plus className="h-3 w-3" />
            {showAdd ? "Cancel" : "Add"}
          </button>
        </div>

        {/* Adjustments List */}
        {adjustments.length === 0 ? (
          <div className="text-[11px] text-muted-foreground py-3 text-center italic">
            No adjustments applied to this invoice.
          </div>
        ) : (
          <div className="max-h-20 overflow-y-auto space-y-1 pr-1">
            {adjustments.map((adj, index) => {
              const sign = adj.direction === "SUBTRACT" ? "-" : "+";
              const formattedVal = adj.method === "PERCENTAGE" 
                ? `${adj.value}%` 
                : adj.method === "PER_WEIGHT" 
                  ? `${adj.value}/${adj.unit || "KG"}`
                  : adj.method === "PER_BAG"
                    ? `${adj.value}/BAG`
                    : `PKR ${adj.value}`;
              
              return (
                <div key={index} className="flex items-center justify-between bg-muted/40 border rounded-lg px-2.5 py-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">{adj.adjustmentType}</span>
                    <span className="text-muted-foreground text-[9px]">({adj.method.toLowerCase().replace("_", " ")})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold ${adj.direction === "SUBTRACT" ? "text-red-500" : "text-green-500"}`}>
                      {sign}{formattedVal}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveAdjustment(index)}
                      className="p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                      title="Remove adjustment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Adjustment Form */}
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-3.5 space-y-3 animate-in zoom-in-95 duration-200 text-left">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-primary" />
                  Add Invoice Adjustment
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Adjustment Type</label>
                    <select
                      value={newAdj.adjustmentType}
                      onChange={(e) => setNewAdj({ ...newAdj, adjustmentType: e.target.value })}
                      className="w-full bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary text-foreground"
                    >
                      {visibleAdjustmentTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Calculation Mode</label>
                    <select
                      value={newAdj.method}
                      onChange={(e) => setNewAdj({ ...newAdj, method: e.target.value })}
                      className="w-full bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary text-foreground"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount (PKR)</option>
                      <option value="PER_WEIGHT">Per Weight (PKR/Unit)</option>
                      <option value="PER_BAG">Per Bag (PKR/Bag)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Value</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={newAdj.value}
                      onChange={(e) => setNewAdj({ ...newAdj, value: e.target.value })}
                      className="w-full bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary font-semibold text-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Direction</label>
                    <select
                      value={newAdj.direction}
                      onChange={(e) => setNewAdj({ ...newAdj, direction: e.target.value })}
                      className="w-full bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary text-foreground"
                    >
                      <option value="ADD">Add (+)</option>
                      <option value="SUBTRACT">Subtract (-)</option>
                    </select>
                  </div>

                  {newAdj.method === "PER_WEIGHT" && (
                    <div className="col-span-2 space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Weight Unit</label>
                      <select
                        value={newAdj.unit}
                        onChange={(e) => setNewAdj({ ...newAdj, unit: e.target.value })}
                        className="w-full bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary text-foreground"
                      >
                        <option value="KG">KG</option>
                        <option value="MAUND">Maund</option>
                        <option value="TON">Ton</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="px-3 py-1.5 text-xs font-bold bg-muted hover:bg-accent text-foreground rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invoice Notes / Remarks */}
        <div className="space-y-1 pt-1.5 border-t border-border/40">
          <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
            Invoice Notes / Remarks
          </label>
          <textarea
            rows="1"
            placeholder="Enter instructions, logistics info, vehicle details, etc."
            value={notes}
            onChange={(e) => onChangeNotes?.(e.target.value)}
            className="w-full bg-background border border-border hover:border-muted-foreground/30 focus:border-primary rounded-lg px-2.5 py-1 text-[11px] outline-none transition-colors resize-none font-medium text-foreground"
          />
        </div>
      </div>

      {/* Right Column: Calculations Breakdown & Totals */}
      <div className="flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-border/40 pt-2 lg:pt-0 lg:pl-4 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/80 flex items-center gap-1.5 border-b border-border/40 pb-1.5">
          <Percent className="h-3.5 w-3.5 text-primary" />
          Financial Summary
        </h3>

        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            <span>Base Subtotal</span>
          </div>
          <div className="text-right font-mono font-semibold text-foreground">
            PKR {round(totals.baseAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Scale className="h-3 w-3" />
            <span>Total Weight</span>
          </div>
          <div className="text-right font-mono font-semibold text-foreground">
            {round(totals.totalWeight).toLocaleString()} KG
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Archive className="h-3 w-3" />
            <span>Derived Bag Count</span>
          </div>
          <div className="text-right font-mono font-semibold text-foreground">
            {round(totals.totalBagCount, 1).toLocaleString()} bags
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Tag className="h-3 w-3" />
            <span>Adjustments Sum</span>
          </div>
          <div className="text-right font-mono font-semibold text-foreground">
            {totals.totalAdjustments < 0 ? "-" : ""} PKR {Math.abs(round(totals.totalAdjustments)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Final Amount display */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 flex items-center justify-between mt-1.5">
          <span className="text-xs font-bold text-primary uppercase tracking-wide">Final Amount</span>
          <span className="text-lg font-black font-mono text-primary tracking-tight">
            PKR {round(totals.finalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
