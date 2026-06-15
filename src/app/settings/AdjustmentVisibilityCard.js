"use client";

import React, { useState, useEffect } from "react";
import { Eye, Sliders, ToggleLeft } from "lucide-react";
import { toast } from "sonner";
import { ADJUSTMENT_TYPES_BUYER, ADJUSTMENT_TYPES_SUPPLIER } from "@/lib/constants";
import { getAdjustmentKey } from "@/lib/settings/adjustmentsVisibility";
import { getAdjustmentVisibilityAction, saveAdjustmentVisibilityAction } from "@/modules/settings/controllers/settingsActions";

export default function AdjustmentVisibilityCard({ allowedAdjustments = null }) {
  const [mounted, setMounted] = useState(false);
  const [visibility, setVisibility] = useState({});
  const [saving, setSaving] = useState(false);

  const buyerAdjustments = allowedAdjustments?.buyer || ADJUSTMENT_TYPES_BUYER;
  const supplierAdjustments = allowedAdjustments?.supplier || ADJUSTMENT_TYPES_SUPPLIER;

  // Derive unique adjustments dynamically from the allowed lists
  const uniqueAdjustments = Array.from(
    new Set([...buyerAdjustments, ...supplierAdjustments])
  );

  useEffect(() => {
    async function loadSettings() {
      const res = await getAdjustmentVisibilityAction();
      if (res.success) {
        setVisibility(res.settings?.adjustmentVisibility || {});
      } else {
        toast.error("Failed to load adjustments visibility from database.");
      }
      setMounted(true);
    }
    loadSettings();
  }, []);

  const handleToggle = (type) => {
    const key = getAdjustmentKey(type);
    setVisibility((prev) => ({
      ...prev,
      [key]: prev[key] === false ? true : false, // toggle: undefined/true -> false, false -> true
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveAdjustmentVisibilityAction(visibility);
    setSaving(false);
    if (res.success) {
      toast.success("Adjustment visibility settings saved to database!");
    } else {
      toast.error(res.error || "Failed to save settings.");
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 animate-pulse">
        <div className="h-6 w-1/3 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <Eye className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-base">Invoice Adjustments Visibility</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Control which adjustment types (Commission, Labour, Rent, Kaat, etc.) are active and selectable during invoice generation. Disabled items will be hidden from creation forms and dropdowns.
      </p>

      <form onSubmit={handleSave} className="space-y-6 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {uniqueAdjustments.map((type) => {
            const key = getAdjustmentKey(type);
            const isVisible = visibility[key] !== false; // Default to true (visible)
            
            return (
              <div
                key={type}
                onClick={() => handleToggle(type)}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isVisible 
                    ? "bg-primary/5 border-primary/20 hover:bg-primary/10" 
                    : "bg-muted/30 border-muted hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  id={`visible-${key}`}
                  checked={isVisible}
                  onChange={() => {}} // Handled by div onClick for larger click target
                  className="h-4.5 w-4.5 rounded border-muted text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                />
                <div className="flex-1">
                  <label
                    htmlFor={`visible-${key}`}
                    className="text-sm font-semibold text-foreground cursor-pointer block leading-none"
                    onClick={(e) => e.preventDefault()} // Let parent click handler manage toggle
                  >
                    {type}
                  </label>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    {buyerAdjustments.includes(type) && supplierAdjustments.includes(type)
                      ? "Buyer & Supplier"
                      : buyerAdjustments.includes(type)
                      ? "Buyer Only"
                      : "Supplier Only"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving Settings..." : "Save Visibility Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
