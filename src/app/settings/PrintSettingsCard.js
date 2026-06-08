"use client";

import React, { useState, useEffect } from "react";
import { Printer, Layout, FileText, Eye, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { getPrintSettingsAction, savePrintSettingsAction } from "@/modules/settings/controllers/settingsActions";

export default function PrintSettingsCard() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState({
    defaultTemplate: "STANDARD",
    paperSize: "A4",
    orientation: "PORTRAIT",
    showLogo: true,
    showWatermark: false,
    showSignatures: true,
    showDuplicateLabel: true,
    footerNotes: "",
    defaultCurrency: "Rs.",
    autoPrintAfterSave: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const res = await getPrintSettingsAction();
      if (res.success) {
        setSettings(res.settings);
      } else {
        toast.error("Failed to load print settings.");
      }
      setMounted(true);
    }
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await savePrintSettingsAction(settings);
    setSaving(false);

    if (res.success) {
      toast.success("Print & document settings saved successfully!");
    } else {
      toast.error(res.error || "Failed to save print settings.");
    }
  };

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">Print & Document Settings</h3>
        </div>
        <a
          href="/print/preview"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
        >
          <Eye className="h-3.5 w-3.5 text-primary" />
          Open Live Preview Editor
        </a>
      </div>

      <p className="text-sm text-muted-foreground">
        Configure document branding, template defaults, layout preferences, signatures, and printing metadata. These configurations only affect rendering and presentation, and have no side-effects on accounts, ledgers, or database transactions.
      </p>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Default Template */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Layout className="h-3.5 w-3.5 text-primary" /> Default Template
            </label>
            <select
              value={settings.defaultTemplate}
              onChange={(e) => handleChange("defaultTemplate", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="STANDARD">Standard ERP Design</option>
            </select>
          </div>

          {/* Paper Size */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" /> Paper Size
            </label>
            <select
              value={settings.paperSize}
              onChange={(e) => handleChange("paperSize", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="A4">A4 (Standard)</option>
              <option value="A5">A5 (Half Page)</option>
              <option value="LETTER">Letter</option>
            </select>
          </div>

          {/* Orientation */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5 text-primary" /> Orientation
            </label>
            <select
              value={settings.orientation}
              onChange={(e) => handleChange("orientation", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="PORTRAIT">Portrait</option>
              <option value="LANDSCAPE">Landscape</option>
            </select>
          </div>
        </div>

        {/* Visibility Toggles Header */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
            Document Section Visibility
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Show Logo */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold block">Show Company Logo</span>
                <span className="text-xs text-muted-foreground">Renders business symbol placeholder in document header.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("showLogo")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showLogo ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.showLogo ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Show Watermark */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold block">Show Background Watermark</span>
                <span className="text-xs text-muted-foreground">Injects custom company name text watermark behind tables.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("showWatermark")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showWatermark ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.showWatermark ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Show Signatures */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold block">Include Signatures Section</span>
                <span className="text-xs text-muted-foreground">Renders &quot;Prepared By&quot; and &quot;Authorized Signature&quot; sign-off blocks.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("showSignatures")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showSignatures ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.showSignatures ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Show Duplicate Copy Tag */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold block">Render Duplicate Copy Tag</span>
                <span className="text-xs text-muted-foreground">Displays an official copy indicator at the top right of print outs.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("showDuplicateLabel")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showDuplicateLabel ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.showDuplicateLabel ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Notes Textarea */}
        <div className="border-t pt-6 space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
            Custom Document Footer Notes (Optional)
          </label>
          <textarea
            rows={3}
            value={settings.footerNotes}
            onChange={(e) => handleChange("footerNotes", e.target.value)}
            placeholder="Add general terms, thank you messages, legal notices, or payment policies..."
            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
          />
          <p className="text-xs text-muted-foreground">
            Appears at the absolute bottom of all printed invoices and receipts above the audit trail metadata.
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/95 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            {saving ? "Saving Preferences..." : "Save Print Preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}
