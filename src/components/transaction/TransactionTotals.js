"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, Tag, Percent, DollarSign, Scale, Archive, X } from "lucide-react";
import { round } from "@/lib/financial";
import { useSettings } from "@/components/layout/SettingsContext";
import { formatNumber } from "@/lib/formatters/financialFormatter";
import { formatUnitDisplay } from "@/lib/formatters/unitFormatter";

export default function TransactionTotals({
  totals = { baseAmount: 0, totalWeight: 0, totalAdjustments: 0, finalAmount: 0, totalBagCount: 0 },
  adjustments = [],
  onAddAdjustment,
  onRemoveAdjustment,
  onEditAdjustmentValue,
  adjustmentDefinitions = [],
  notes = "",
  onChangeNotes
}) {
  const { settings, decimalPlaces, currencySymbol } = useSettings();
  const [showAdd, setShowAdd] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showNotes, setShowNotes] = useState(!!notes);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (notes) {
      setShowNotes(true);
    }
  }, [notes]);
  const [newAdj, setNewAdj] = useState({
    code: null,
    adjustmentType: "Custom",
    method: "FIXED",
    value: "",
    direction: "ADD",
    unit: "KG"
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newAdj.value || isNaN(parseFloat(newAdj.value))) return;
    
    const selectedDef = newAdj.code ? adjustmentDefinitions.find(d => d.code === newAdj.code) : null;
    
    onAddAdjustment({
      code: newAdj.code || "CUSTOM",
      adjustmentType: newAdj.adjustmentType,
      method: newAdj.method,
      value: parseFloat(newAdj.value),
      direction: newAdj.direction,
      unit: newAdj.method === "PER_WEIGHT" ? newAdj.unit : null,
      isUserEditable: selectedDef ? selectedDef.isUserEditable : true
    });
    
    setNewAdj({
      code: null,
      adjustmentType: "Custom",
      method: "FIXED",
      value: "",
      direction: "ADD",
      unit: "KG"
    });
    setShowAdd(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-card border border-border/60 rounded-xl p-3 shadow-sm backdrop-blur-md">
      {/* Left Column: Active Adjustments & Add Adjustment */}
      <div className="flex flex-col justify-between gap-2 h-full">
        <div className="flex items-center justify-between border-b border-border/40 pb-1.5 shrink-0">
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
          <div className="text-[11px] text-muted-foreground py-3 text-center italic flex-1 flex items-center justify-center min-h-[60px]">
            No adjustments applied to this invoice.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-3 gap-1.5 content-start min-h-[60px]">
            {adjustments.map((adj, index) => {
              const sign = adj.direction === "SUBTRACT" ? "-" : "+";
              const definition = adjustmentDefinitions.find(d => d.code === adj.code);
              const isEditable = typeof adj.isUserEditable !== "undefined" && adj.isUserEditable !== null
                ? adj.isUserEditable
                : (definition ? definition.isUserEditable : true);
              
              const methodName = adj.method === "PER_WEIGHT" ? "Per Weight" : adj.method === "PER_BAG" ? "Per Bag" : adj.method === "PERCENTAGE" ? "Percentage" : "Fixed";
              const displayName = `${adj.adjustmentType} - ${methodName}`;
              
              return (
                <div key={index} className="flex flex-col justify-between bg-muted/40 border rounded-lg p-1.5 h-[56px] relative group shrink-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-foreground text-xs truncate flex-1" title={displayName}>
                      {displayName}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveAdjustment(index)}
                      className="text-muted-foreground hover:text-destructive rounded transition-colors shrink-0 p-0.5"
                      title="Remove adjustment"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      {isEditable ? (
                        <input
                          type="number"
                          step="any"
                          value={adj.value}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value;
                            onEditAdjustmentValue?.(index, val === "" ? "" : Number(val));
                          }}
                          className="w-full px-1.5 py-0.5 text-xs border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-right"
                        />
                      ) : (
                        <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded block text-right">
                          {adj.value !== "" ? adj.value : 0}
                        </span>
                      )}
                    </div>
                    <span className={`font-mono font-bold shrink-0 text-xs ${adj.direction === "SUBTRACT" ? "text-red-500" : "text-green-500"}`}>
                      {sign}{adj.method === "PERCENTAGE" ? "%" : adj.method === "PER_WEIGHT" ? `/${adj.unit || "KG"}` : adj.method === "PER_BAG" ? "/BAG" : "PKR"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Adjustment Form */}
        {showAdd && mounted && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-3.5 space-y-3 animate-in zoom-in-95 duration-200 text-left" onClick={(e) => e.stopPropagation()}>
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
                {(() => {
                  const selectedDef = newAdj.code ? adjustmentDefinitions.find(d => d.code === newAdj.code) : null;
                  const isCurrentEditable = selectedDef ? selectedDef.isUserEditable : true;
                  return (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Adjustment Type</label>
                        <select
                          value={newAdj.code || "CUSTOM"}
                          onChange={(e) => {
                            const selectedCode = e.target.value;
                            if (selectedCode === "CUSTOM") {
                              setNewAdj({
                                code: null,
                                adjustmentType: "Custom",
                                method: "FIXED",
                                value: "",
                                direction: "ADD",
                                unit: "KG"
                              });
                            } else {
                              const def = adjustmentDefinitions.find(d => d.code === selectedCode);
                              if (def) {
                                setNewAdj({
                                  code: def.code,
                                  adjustmentType: def.name,
                                  method: def.method,
                                  value: def.defaultConfiguredValue !== null ? String(def.defaultConfiguredValue) : "",
                                  direction: def.direction,
                                  unit: "KG"
                                });
                              }
                            }
                          }}
                          className="w-full bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary text-foreground"
                        >
                          <option value="CUSTOM">Custom (Manual)</option>
                          {adjustmentDefinitions.map((def) => (
                            <option key={def.code} value={def.code}>{def.name} ({def.code})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Calculation Mode</label>
                        <select
                          value={newAdj.method}
                          onChange={(e) => setNewAdj({ ...newAdj, method: e.target.value })}
                          disabled={!isCurrentEditable}
                          className="w-full bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary text-foreground disabled:opacity-60"
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
                          disabled={!isCurrentEditable}
                          className="w-full bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary font-semibold text-foreground disabled:opacity-60"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Direction</label>
                        <select
                          value={newAdj.direction}
                          onChange={(e) => setNewAdj({ ...newAdj, direction: e.target.value })}
                          disabled={!isCurrentEditable}
                          className="w-full bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary text-foreground disabled:opacity-60"
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
                            disabled={!isCurrentEditable}
                            className="w-full bg-background border rounded px-2 py-1 text-xs outline-none focus:border-primary text-foreground disabled:opacity-60"
                          >
                            <option value="KG">KG</option>
                            <option value="MAUND">Maund</option>
                            <option value="TON">Ton</option>
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })()}

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
          </div>,
          document.body
        )}

        {/* Invoice Notes / Remarks */}
        <div className="pt-1.5 border-t border-border/40 shrink-0">
          {showNotes ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Invoice Notes / Remarks
                </label>
                <button
                  type="button"
                  onClick={() => {
                    onChangeNotes?.("");
                    setShowNotes(false);
                  }}
                  className="text-[9px] text-destructive hover:underline font-bold"
                >
                  Remove Note
                </button>
              </div>
              <textarea
                rows="1"
                placeholder="Enter instructions, logistics info, vehicle details, etc."
                value={notes}
                onChange={(e) => onChangeNotes?.(e.target.value)}
                className="w-full bg-background border border-border hover:border-muted-foreground/30 focus:border-primary rounded-lg px-2.5 py-1 text-[11px] outline-none transition-colors resize-none font-medium text-foreground"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              + Add Notes / Remarks
            </button>
          )}
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
            {currencySymbol} {formatNumber(totals.baseAmount, "en", decimalPlaces)}
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Scale className="h-3 w-3" />
            <span>Total Quantity</span>
          </div>
          <div className="text-right font-mono font-semibold text-foreground">
            {formatUnitDisplay(totals.totalWeight, "KG", null, "en", null, settings)}
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Archive className="h-3 w-3" />
            <span>Derived Unit Count</span>
          </div>
          <div className="text-right font-mono font-semibold text-foreground">
            {formatUnitDisplay(totals.totalBagCount, "BAG", null, "en", null, settings)}
          </div>

          <div className="flex items-center gap-1 text-muted-foreground">
            <Tag className="h-3 w-3" />
            <span>Adjustments Sum</span>
          </div>
          <div className="text-right font-mono font-semibold text-foreground">
            {totals.totalAdjustments < 0 ? "-" : ""} {currencySymbol} {formatNumber(Math.abs(totals.totalAdjustments), "en", decimalPlaces)}
          </div>
        </div>

        {/* Final Amount display */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 flex items-center justify-between mt-1.5">
          <span className="text-xs font-bold text-primary uppercase tracking-wide">Final Amount</span>
          <span className="text-lg font-black font-mono text-primary tracking-tight">
            {currencySymbol} {formatNumber(totals.finalAmount, "en", decimalPlaces)}
          </span>
        </div>
      </div>
    </div>
  );
}
