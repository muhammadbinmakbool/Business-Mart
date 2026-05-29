"use client";

import React, { useState, useEffect } from "react";
import { Sliders, Scale, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { 
  getPreferredWeightUnit, 
  getPreferredRateUnit, 
  setPreferredWeightUnit, 
  setPreferredRateUnit 
} from "@/lib/display-units";
import { UNIT_IDS } from "@/lib/units";

export default function DisplayUnitSettingsCard() {
  const [weightUnit, setWeightUnit] = useState("KG");
  const [rateUnit, setRateUnit] = useState("KG");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setWeightUnit(getPreferredWeightUnit());
    setRateUnit(getPreferredRateUnit());
    setMounted(true);
  }, []);

  function handleSave(e) {
    e.preventDefault();
    setPreferredWeightUnit(weightUnit);
    setPreferredRateUnit(rateUnit);
    toast.success("UI display preferences saved successfully!");
  }

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
        <Sliders className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-base">Invoice UI Display Preferences</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Configure the preferred default units displayed in invoice creation and entry flows. These preferences are purely visual presentation defaults and do not alter the underlying standard storage baseline (KG).
      </p>

      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="prefWeightUnit" className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5" /> Preferred Weight Unit
            </label>
            <select
              id="prefWeightUnit"
              value={weightUnit}
              onChange={(e) => setWeightUnit(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value={UNIT_IDS.KG}>Kilogram (KG)</option>
              <option value={UNIT_IDS.MAUND}>Maund (MAUND)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="prefRateUnit" className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Preferred Rate Unit
            </label>
            <select
              id="prefRateUnit"
              value={rateUnit}
              onChange={(e) => setRateUnit(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            >
              <option value={UNIT_IDS.KG}>per KG (/KG)</option>
              <option value={UNIT_IDS.MAUND}>per Maund (/MAUND)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            Save UI Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
