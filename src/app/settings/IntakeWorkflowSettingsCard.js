"use client";

import React, { useState, useEffect } from "react";
import { GitCommit, Pencil, X, Check, AlertTriangle, Link2 } from "lucide-react";
import { toast } from "sonner";
import { getIntakeWorkflowSettingsAction, saveIntakeWorkflowSettingsAction } from "@/modules/settings/controllers/settingsActions";

export default function IntakeWorkflowSettingsCard() {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [initialSettings, setInitialSettings] = useState(null);
  const [settings, setSettings] = useState({
    defaultIntakeStatus: "PENDING",
    enablePartialSelling: true,
    requireBuyerBeforeSelling: true,
    autoCreateSalesTrack: true,
    requireCancellationNotes: false
  });

  useEffect(() => {
    async function loadSettings() {
      const res = await getIntakeWorkflowSettingsAction();
      if (res.success) {
        setSettings(res.settings);
        setInitialSettings(res.settings);
      } else {
        toast.error("Failed to load intake workflow settings.");
      }
      setMounted(true);
    }
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsEditing(true);
  };

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...settings,
      autoCreateSalesTrack: true // Always enforce true in backend payload
    };

    const res = await saveIntakeWorkflowSettingsAction(payload);
    setSaving(false);

    if (res.success) {
      setInitialSettings(payload);
      setIsEditing(false);
      toast.success("Intake workflow settings saved successfully!");
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
          <GitCommit className="h-5 w-5 text-indigo-500" />
          <h3 className="font-bold text-base">Intake Workflow Settings</h3>
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
        Configure default behaviors, partial selling permissions, buyer validation constraints, and transaction cancellation requirements.
      </p>

      {/* Alert if Editing */}
      {isEditing && (
        <div className="flex items-start gap-3 rounded-xl border border-indigo-200/50 bg-indigo-50/50 p-4 text-xs text-indigo-800 leading-relaxed dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-300">
          <AlertTriangle className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Notice:</span> Modifications influence future transaction lifecycles only. Calculations, reconciliations, and historical documents remain untouched.
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Default Intake Status - Dropdown stays enabled per user guidelines */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
              Default Intake Status
            </label>
            <select
              value={settings.defaultIntakeStatus}
              onChange={(e) => handleChange("defaultIntakeStatus", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="PENDING">PENDING</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
            <span className="text-[10px] text-muted-foreground block">
              Initial status pre-selected during manual intake creation.
            </span>
          </div>
        </div>

        {/* Toggles Area */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
            Workflow Control & Safety Toggles
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Enable Partial Selling */}
            <div className="flex items-center justify-between p-4 rounded-xl border transition-colors bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Enable Partial Selling</span>
                <span className="text-xs text-muted-foreground">Allows operators to execute split sales on remaining intake quantities.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("enablePartialSelling")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.enablePartialSelling ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.enablePartialSelling ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Require Buyer Before Selling */}
            <div className="flex items-center justify-between p-4 rounded-xl border transition-colors bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Require Buyer Before Selling</span>
                <span className="text-xs text-muted-foreground">Forces assignment of a registered buyer party before executing a sale transaction.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("requireBuyerBeforeSelling")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.requireBuyerBeforeSelling ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.requireBuyerBeforeSelling ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Require Notes On Cancellation */}
            <div className="flex items-center justify-between p-4 rounded-xl border transition-colors bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Require Cancellation Notes</span>
                <span className="text-xs text-muted-foreground">Demands cancellation remarks when invalidating intake, sale, or supplier transactions.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("requireCancellationNotes")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.requireCancellationNotes ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.requireCancellationNotes ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Auto Create Sales Track - System Locked Dependency */}
            <div className="flex items-center justify-between p-4 rounded-xl border transition-colors bg-muted/10 opacity-75">
              <div className="space-y-0.5 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold block">Auto Create Sales Track</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30">
                    <Link2 className="h-2.5 w-2.5" /> SYSTEM MANDATORY
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Creates SalesTrack records during splits to ensure correct supplier settlements and audit tracing.</span>
              </div>
              <button
                type="button"
                disabled
                className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-primary/45 transition-colors"
              >
                <span className="pointer-events-none inline-block h-5 w-5 transform translate-x-5 rounded-full bg-background/70 shadow ring-0" />
              </button>
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
