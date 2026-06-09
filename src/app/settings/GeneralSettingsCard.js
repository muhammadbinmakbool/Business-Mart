"use client";

import React, { useState, useEffect } from "react";
import { Building2, Phone, Mail, MapPin, Image as ImageIcon, Landmark, Globe, Clock, Calendar, Check, AlertTriangle, Pencil, X, Keyboard } from "lucide-react";
import { toast } from "sonner";
import { getGeneralSettingsAction, saveGeneralSettingsAction, uploadLogoAction } from "@/modules/settings/controllers/settingsActions";

export default function GeneralSettingsCard() {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [initialSettings, setInitialSettings] = useState(null);
  const [settings, setSettings] = useState({
    businessName: "Rehmania & Company",
    businessShortName: "R&C",
    phoneNumber: "0301-6782024",
    businessEmail: "info@rehmania-grain.com",
    address: "Grain Market, Rahim Yar Khan, Punjab, Pakistan",
    logoPath: "",
    currencyCode: "PKR",
    currencySymbol: "Rs.",
    defaultLanguage: "en",
    timezone: "Asia/Karachi",
    dateFormat: "DD/MM/YYYY",
    decimalPlaces: 2,
    showFastEntryHelper: true
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const res = await getGeneralSettingsAction();
      if (res.success) {
        setSettings(res.settings);
        setInitialSettings(res.settings);
        if (res.settings.logoPath) {
          setLogoPreview(res.settings.logoPath);
        }
      } else {
        toast.error("Failed to load general settings.");
      }
      setMounted(true);
    }
    loadSettings();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Logo file size must be less than 2MB");
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    setSettings((prev) => ({ ...prev, logoPath: "" }));
  };

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (initialSettings) {
      setSettings(initialSettings);
      setLogoPreview(initialSettings.logoPath || "");
      setLogoFile(null);
    }
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!settings.businessName || !settings.businessName.trim()) {
      toast.error("Business Name is required");
      return;
    }
    
    setSaving(true);
    let currentLogoPath = settings.logoPath;

    // Handle logo file upload if selected
    if (logoFile) {
      const formData = new FormData();
      formData.append("logo", logoFile);
      const uploadRes = await uploadLogoAction(formData);
      
      if (uploadRes.success) {
        currentLogoPath = uploadRes.logoPath;
      } else {
        toast.error(`Logo upload failed: ${uploadRes.error}`);
        setSaving(false);
        return;
      }
    }

    const finalSettings = {
      ...settings,
      logoPath: currentLogoPath
    };

    const res = await saveGeneralSettingsAction(finalSettings);
    setSaving(false);

    if (res.success) {
      toast.success("General settings saved successfully!");
      setLogoFile(null);
      setSettings(finalSettings);
      setInitialSettings(finalSettings);
      setIsEditing(false);
    } else {
      toast.error(res.error || "Failed to save general settings.");
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
      <div className="flex justify-between items-center border-b pb-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">General Settings & Organization Profile</h3>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit Profile & Settings
          </button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Configure application branding, default currencies, timezone locales, and date formats. These settings synchronize branding metadata across all invoice layouts, reports, and dashboards.
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Identity Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Business Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" /> Business Name <span className="text-destructive font-black">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!isEditing}
              value={settings.businessName}
              onChange={(e) => handleChange("businessName", e.target.value)}
              placeholder="e.g. Rehmania & Company"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-muted/10"
            />
          </div>

          {/* Business Short Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" /> Business Short Name / Acronym
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={settings.businessShortName}
              onChange={(e) => handleChange("businessShortName", e.target.value)}
              placeholder="e.g. R&C"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-muted/10"
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-primary" /> Contact Phone
            </label>
            <input
              type="text"
              disabled={!isEditing}
              value={settings.phoneNumber}
              onChange={(e) => handleChange("phoneNumber", e.target.value)}
              placeholder="e.g. 0301-6782024"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-muted/10"
            />
          </div>

          {/* Business Email */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" /> Business Email
            </label>
            <input
              type="email"
              disabled={!isEditing}
              value={settings.businessEmail}
              onChange={(e) => handleChange("businessEmail", e.target.value)}
              placeholder="e.g. info@rehmania-grain.com"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-muted/10"
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Business Address
            </label>
            <textarea
              rows={2}
              disabled={!isEditing}
              value={settings.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="e.g. Grain Market, Rahim Yar Khan, Punjab, Pakistan"
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-muted/10"
            />
          </div>
        </div>

        {/* Logo Selection Section */}
        <div className="border-t pt-5 space-y-4">
          <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-primary" /> Organization Logo File
          </label>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border bg-muted/10">
            {logoPreview ? (
              <div className="relative h-20 w-20 rounded-lg border bg-white overflow-hidden flex items-center justify-center shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview} alt="Logo preview" className="object-contain max-h-full max-w-full" />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground bg-background">
                <ImageIcon className="h-6 w-6 opacity-30" />
                <span className="text-[10px] mt-1 font-semibold uppercase tracking-wider">No Logo</span>
              </div>
            )}

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <label className="px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
                  Upload Custom Logo
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="border border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                Supported formats: PNG, JPG, JPEG, SVG. Maximum file size: 2MB. Logo file is saved directly to host server directory storage.
              </p>
            </div>
          </div>
        </div>

        {/* Currency & Formatting Section */}
        <div className="border-t pt-5 space-y-4">
          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
            Currency & Localization Defaults
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {/* Currency Symbol */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" /> Currency Symbol
              </label>
              <select
                value={settings.currencySymbol}
                onChange={(e) => handleChange("currencySymbol", e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Rs.">Rs. (PKR Symbol)</option>
                <option value="$">$ (USD Symbol)</option>
                <option value="£">£ (GBP Symbol)</option>
                <option value="€">€ (EUR Symbol)</option>
                <option value="AED">AED (AED Symbol)</option>
              </select>
            </div>

            {/* Currency Code */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" /> Currency Code
              </label>
              <select
                value={settings.currencyCode}
                onChange={(e) => handleChange("currencyCode", e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="PKR">PKR (Pakistani Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="AED">AED (UAE Dirham)</option>
              </select>
            </div>

            {/* Financial Precision (Decimal Places) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5 text-primary" /> Decimal Places (Precision)
              </label>
              <select
                value={settings.decimalPlaces}
                onChange={(e) => handleChange("decimalPlaces", e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="0">0 (e.g. 5,000)</option>
                <option value="1">1 (e.g. 5,000.0)</option>
                <option value="2">2 (e.g. 5,000.00)</option>
                <option value="3">3 (e.g. 5,000.000)</option>
                <option value="4">4 (e.g. 5,000.0000)</option>
              </select>
            </div>

            {/* Default Language (Placeholder) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-primary" /> Default Language
              </label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) => handleChange("defaultLanguage", e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="en">English</option>
                <option value="ur">Urdu (اردو)</option>
              </select>
            </div>

            {/* Default Timezone */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Asia/Karachi">Asia/Karachi (GMT+5)</option>
                <option value="UTC">UTC (Universal Time)</option>
              </select>
            </div>

            {/* Default Date Format */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Date Format
              </label>
              <select
                value={settings.dateFormat}
                onChange={(e) => handleChange("dateFormat", e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 31/12/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 12/31/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-12-31)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Fast Entry Guide Section */}
        <div className="border-t pt-5 space-y-4">
          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
            <Keyboard className="h-4 w-4 text-primary" /> Fast Entry Shortcuts Guide
          </h4>
          
          <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/10">
            <input
              type="checkbox"
              id="showFastEntryHelper"
              disabled={!isEditing}
              checked={settings.showFastEntryHelper !== false}
              onChange={(e) => {
                handleChange("showFastEntryHelper", e.target.checked);
                if (e.target.checked) {
                  localStorage.removeItem("fast_entry_helper_dismissed_intake");
                  localStorage.removeItem("fast_entry_helper_dismissed_sales");
                  localStorage.removeItem("fast_entry_helper_dismissed_party");
                }
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="space-y-0.5">
              <label htmlFor="showFastEntryHelper" className="text-sm font-bold text-card-foreground cursor-pointer disabled:cursor-not-allowed">
                Display Floating Shortcuts Help Guide
              </label>
              <p className="text-xs text-muted-foreground leading-normal">
                When active, a floating cheat sheet displays in the bottom-right corner of Fast Entry views (Intake, Sales, and Party Creation) showing keyboard shortcuts. Users can dismiss them individually via the "x" button.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button Panel */}
        {isEditing ? (
          <div className="flex justify-end gap-3 pt-5 border-t">
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
                <>Saving Settings...</>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Save General Settings
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-primary font-medium">
            <AlertTriangle className="h-4 w-4" />
            <span>Settings editing is locked. Click the "Edit Profile & Settings" button at the top to modify these configurations.</span>
          </div>
        )}
      </form>
    </div>
  );
}
