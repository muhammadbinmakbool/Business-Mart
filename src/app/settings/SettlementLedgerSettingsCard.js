"use client";

import React, { useState, useEffect } from "react";
import { Sliders, Pencil, X, Check, AlertTriangle, Settings2, Eye } from "lucide-react";
import { toast } from "sonner";
import { getSettlementLedgerSettingsAction, saveSettlementLedgerSettingsAction } from "@/modules/settings/controllers/settingsActions";

export default function SettlementLedgerSettingsCard() {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [initialSettings, setInitialSettings] = useState(null);
  const [settings, setSettings] = useState({
    reconciliationTolerance: 1.00,
    defaultAdjustmentVisibility: {
      commission: true,
      labour: true,
      rent: true,
      kaat: true
    },
    autoMarkOutdatedInvoices: true,
    requireConfirmationBeforeRegeneration: true
  });

  useEffect(() => {
    async function loadSettings() {
      const res = await getSettlementLedgerSettingsAction();
      if (res.success) {
        setSettings(res.settings);
        setInitialSettings(res.settings);
      } else {
        toast.error("Failed to load settlement & ledger settings.");
      }
      setMounted(true);
    }
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleNestedToggle = (key) => {
    if (!isEditing) return;
    setSettings((prev) => ({
      ...prev,
      defaultAdjustmentVisibility: {
        ...prev.defaultAdjustmentVisibility,
        [key]: !prev.defaultAdjustmentVisibility[key]
      }
    }));
  };

  const handleToggle = (key) => {
    if (!isEditing) return;
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCancel = () => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const tolerance = parseFloat(settings.reconciliationTolerance);
    if (isNaN(tolerance) || tolerance < 0) {
      toast.error("Reconciliation tolerance must be a non-negative number.");
      return;
    }

    setSaving(true);
    const payload = {
      ...settings,
      reconciliationTolerance: tolerance
    };

    const res = await saveSettlementLedgerSettingsAction(payload);
    setSaving(false);

    if (res.success) {
      setInitialSettings(payload);
      setIsEditing(false);
      toast.success("Settlement & ledger settings saved successfully!");
    } else {
      toast.error(res.error || "Failed to save settings.");
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 animate-pulse">
        <div className="h-6 w-1/3 bg-muted rounded" />
        <div className="h-48 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6 animate-in fade-in duration-200 text-card-foreground">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-indigo-500" />
          <h3 className="font-bold text-base">Settlement & Ledger Settings</h3>
        </div>

        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit Settings
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Configure reconciliation tolerances, default invoice display visibility toggles, and regeneration confirmation dialog parameters.
      </p>

      {/* Warning Alert if Editing */}
      {isEditing && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200/50 bg-indigo-50/50 p-4 text-xs text-indigo-800 leading-relaxed dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-300">
          <AlertTriangle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Caution:</span> Modifying these options alters reconciliation flags and visibility layouts globally. The core ledger reconciliation matching engine remains the sole authority for calculations, but the input parameters and UI validations will update.
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Reconciliation Tolerance */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
              Reconciliation Tolerance
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={settings.reconciliationTolerance}
              disabled={!isEditing}
              onChange={(e) => handleChange("reconciliationTolerance", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <span className="text-[10px] text-muted-foreground block">Max difference (Rs.) allowed to mark live ledger transactions as matched.</span>
          </div>
        </div>

        {/* Adjustment Visibility Toggles */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
            Default Adjustment Type Visibility
          </h4>
          <p className="text-xs text-muted-foreground">
            Configure which adjustment deductions are displayed on settlement lists, previews, and invoice generated layers.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Commission */}
            <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${!isEditing ? "bg-muted/10" : "bg-muted/20"}`}>
              <span className="text-xs font-semibold">Commission</span>
              <button
                type="button"
                disabled={!isEditing}
                onClick={() => handleNestedToggle("commission")}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  settings.defaultAdjustmentVisibility?.commission ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.defaultAdjustmentVisibility?.commission ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Labour */}
            <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${!isEditing ? "bg-muted/10" : "bg-muted/20"}`}>
              <span className="text-xs font-semibold">Labour</span>
              <button
                type="button"
                disabled={!isEditing}
                onClick={() => handleNestedToggle("labour")}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  settings.defaultAdjustmentVisibility?.labour ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.defaultAdjustmentVisibility?.labour ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Rent */}
            <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${!isEditing ? "bg-muted/10" : "bg-muted/20"}`}>
              <span className="text-xs font-semibold">Rent</span>
              <button
                type="button"
                disabled={!isEditing}
                onClick={() => handleNestedToggle("rent")}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  settings.defaultAdjustmentVisibility?.rent ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.defaultAdjustmentVisibility?.rent ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Kaat */}
            <div className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${!isEditing ? "bg-muted/10" : "bg-muted/20"}`}>
              <span className="text-xs font-semibold">Kaat</span>
              <button
                type="button"
                disabled={!isEditing}
                onClick={() => handleNestedToggle("kaat")}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  settings.defaultAdjustmentVisibility?.kaat ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.defaultAdjustmentVisibility?.kaat ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* General Toggles */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
            Workflow Configuration
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Auto Mark Outdated Invoices */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${!isEditing ? "bg-muted/10" : "bg-muted/20"}`}>
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Auto Mark Outdated Invoices</span>
                <span className="text-xs text-muted-foreground">Applies visual warning tags on invoice views if linked transactional intake values differ from generated invoice snapshots.</span>
              </div>
              <button
                type="button"
                disabled={!isEditing}
                onClick={() => handleToggle("autoMarkOutdatedInvoices")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  settings.autoMarkOutdatedInvoices ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.autoMarkOutdatedInvoices ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Require Confirmation Before Regeneration */}
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${!isEditing ? "bg-muted/10" : "bg-muted/20"}`}>
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Require Confirmation Before Regeneration</span>
                <span className="text-xs text-muted-foreground">Force a safety double-confirmation prompt dialog modal before regenerating previously saved invoice periods.</span>
              </div>
              <button
                type="button"
                disabled={!isEditing}
                onClick={() => handleToggle("requireConfirmationBeforeRegeneration")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  settings.requireConfirmationBeforeRegeneration ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.requireConfirmationBeforeRegeneration ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
