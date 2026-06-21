"use client";

import React, { useState, useEffect } from "react";
import { Scale, X, Check, Eye } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "@/components/layout/SettingsContext";
import { getGeneralSettingsAction, saveGeneralSettingsAction } from "@/modules/settings/controllers/settingsActions";
import { formatUnitDisplay } from "@/lib/formatters/unitFormatter";

export default function UnitPrecisionSettingsCard() {
  const { updateSettings } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialSettings, setInitialSettings] = useState(null);
  
  // Local state for settings inputs
  const [unitDisplayPrecision, setUnitDisplayPrecision] = useState(2);
  const [unitLabelFormat, setUnitLabelFormat] = useState("short");

  useEffect(() => {
    async function loadSettings() {
      const res = await getGeneralSettingsAction();
      if (res.success) {
        setInitialSettings(res.settings);
        setUnitDisplayPrecision(res.settings.unitDisplayPrecision !== undefined ? Number(res.settings.unitDisplayPrecision) : 2);
        setUnitLabelFormat(res.settings.unitLabelFormat || "short");
      } else {
        toast.error("Failed to load unit display settings.");
      }
      setMounted(true);
    }
    loadSettings();
  }, []);

  const handleCancel = () => {
    if (initialSettings) {
      setUnitDisplayPrecision(initialSettings.unitDisplayPrecision !== undefined ? Number(initialSettings.unitDisplayPrecision) : 2);
      setUnitLabelFormat(initialSettings.unitLabelFormat || "short");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const updatedGeneralSettings = {
      ...initialSettings,
      unitDisplayPrecision,
      unitLabelFormat
    };

    const res = await saveGeneralSettingsAction(updatedGeneralSettings);
    setSaving(false);

    if (res.success) {
      toast.success("Unit display preferences saved successfully!");
      setInitialSettings(updatedGeneralSettings);
      updateSettings(updatedGeneralSettings);
    } else {
      toast.error(res.error || "Failed to save unit display preferences.");
    }
  };

  // Check if current options differ from persisted settings
  const hasChanges = initialSettings && (
    unitDisplayPrecision !== (initialSettings.unitDisplayPrecision !== undefined ? Number(initialSettings.unitDisplayPrecision) : 2) ||
    unitLabelFormat !== (initialSettings.unitLabelFormat || "short")
  );

  // Generate dynamic preview values using the real formatter engine
  const previewMaundVal = 40.525;
  const previewKgVal = 1.25;

  const previewMaundFormatted = formatUnitDisplay(previewMaundVal, "MAUND", null, "en", null, {
    unitDisplayPrecision,
    unitLabelFormat,
    decimalPlaces: 2
  });

  const previewKgFormatted = formatUnitDisplay(previewKgVal, "KG", null, "en", null, {
    unitDisplayPrecision,
    unitLabelFormat,
    decimalPlaces: 2
  });

  if (!mounted) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 animate-pulse">
        <div className="h-6 w-1/3 bg-muted rounded" />
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6 animate-in fade-in duration-200 text-card-foreground">
      {/* Card Header */}
      <div className="flex justify-between items-center border-b pb-3">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">Unit Precision & Display Settings</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure how fractional quantities and weights decompose across invoice forms, PDF receipts, ledgers, and reports.
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Unit Display Precision Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
              Unit Display Precision
            </label>
            <select
              value={unitDisplayPrecision}
              onChange={(e) => setUnitDisplayPrecision(Number(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="0">0 = Decimal Display</option>
              <option value="1">1 = One-Level Rounded</option>
              <option value="2">2 = Two-Level Decomposition</option>
              <option value="3">3 = Three-Level Decomposition</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Controls decomposition depth. At the last enabled level, remaining quantity is rounded.
            </p>
          </div>

          {/* Unit Label Format Select */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
              Label Format Style
            </label>
            <select
              value={unitLabelFormat}
              onChange={(e) => setUnitLabelFormat(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="short">Short Abbreviations</option>
              <option value="long">Full Unit Names</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              Toggles display labels between short codes and full words.
            </p>
          </div>
        </div>

        {/* Live Formatter Preview Container */}
        <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-muted-foreground tracking-wider">
            <Eye className="h-3.5 w-3.5 text-primary" /> Live Formatter Output Preview
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-background rounded-lg border shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Raw Value: 40.525 Maund</div>
              <div className="font-mono text-sm font-bold text-foreground transition-all duration-200">
                {previewMaundFormatted}
              </div>
            </div>

            <div className="p-3 bg-background rounded-lg border shadow-sm space-y-1">
              <div className="text-[10px] font-bold uppercase text-muted-foreground">Raw Value: 1.25 Kilogram</div>
              <div className="font-mono text-sm font-bold text-foreground transition-all duration-200">
                {previewKgFormatted}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (Visible only when changes are made) */}
        {hasChanges && (
          <div className="flex justify-end gap-3 pt-5 border-t animate-in fade-in slide-in-from-bottom-2 duration-150">
            <button
              type="button"
              onClick={handleCancel}
              className="border border-input hover:bg-accent hover:text-accent-foreground px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/95 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>Saving Changes...</>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Save Preferences
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
