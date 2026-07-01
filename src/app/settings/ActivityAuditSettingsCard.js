"use client";

import React, { useState, useEffect } from "react";
import { Shield, Pencil, X, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getActivityAuditSettingsAction, saveActivityAuditSettingsAction } from "@/modules/settings/controllers/settingsActions";
import { DestructiveModeModal } from "@/components/layout/DestructiveModeModal";
import { exitDestructiveModeAction, getDestructiveModeStatusAction } from "@/modules/auth/controllers/destructiveActions";

export default function ActivityAuditSettingsCard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDestructiveModal, setShowDestructiveModal] = useState(false);
  const [initialSettings, setInitialSettings] = useState(null);
  const [settings, setSettings] = useState({
    logRetentionDays: 30,
    trackEdits: true,
    showDeletedRecords: false,
    allowDestructiveDelete: false
  });

  useEffect(() => {
    async function loadSettings() {
      const [res, destructiveRes] = await Promise.all([
        getActivityAuditSettingsAction(),
        (async () => {
          try {
            return await getDestructiveModeStatusAction();
          } catch {
            return { active: false };
          }
        })()
      ]);

      if (res.success) {
        const mappedSettings = {
          ...res.settings,
          allowDestructiveDelete: destructiveRes?.active || false
        };
        setSettings(mappedSettings);
        setInitialSettings(mappedSettings);
      } else {
        toast.error("Failed to load activity & audit settings.");
      }
      setMounted(true);
    }
    loadSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsEditing(true);
  };

  const handleToggle = async (key) => {
    if (key === "allowDestructiveDelete") {
      if (settings.allowDestructiveDelete) {
        // Exiting Destructive Mode
        setSaving(true);
        const res = await exitDestructiveModeAction();
        setSaving(false);
        if (res.success) {
          setSettings((prev) => ({ ...prev, allowDestructiveDelete: false }));
          setInitialSettings((prev) => ({ ...prev, allowDestructiveDelete: false }));
          toast.success("Destructive Mode deactivated successfully.");
          await saveActivityAuditSettingsAction({
            ...settings,
            allowDestructiveDelete: false
          });
          // Refresh other layout components (e.g. Topbar banner) without hard reload
          router.refresh();
        } else {
          toast.error(res.error || "Failed to deactivate Destructive Mode.");
        }
      } else {
        // Activating Destructive Mode
        setShowDestructiveModal(true);
      }
    } else {
      setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
      setIsEditing(true);
    }
  };

  const handleDestructiveModeSuccess = async () => {
    setSettings((prev) => ({ ...prev, allowDestructiveDelete: true }));
    setInitialSettings((prev) => ({ ...prev, allowDestructiveDelete: true }));
    setShowDestructiveModal(false);
    toast.success("Destructive Mode activated successfully!");
    await saveActivityAuditSettingsAction({
      ...settings,
      allowDestructiveDelete: true
    });
    // Refresh other layout components (e.g. Topbar banner) without hard reload
    router.refresh();
  };

  const handleCancel = () => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const retention = parseInt(settings.logRetentionDays, 10);
    if (isNaN(retention) || retention < 0) {
      toast.error("Log retention days must be a non-negative number.");
      return;
    }

    setSaving(true);
    const payload = {
      ...settings,
      logRetentionDays: retention
    };

    const res = await saveActivityAuditSettingsAction(payload);
    setSaving(false);

    if (res.success) {
      setInitialSettings(payload);
      setIsEditing(false);
      toast.success("Activity & audit settings saved successfully!");
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
          <Shield className="h-5 w-5 text-violet-500" />
          <h3 className="font-bold text-base">Activity & Audit Settings</h3>
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
        Configure operational audit logging parameters, soft-deleted record visibilities, and data purging constraints.
      </p>

      {/* Warning Alert if Editing */}
      {isEditing && (
        <div className="flex items-start gap-3 rounded-xl border border-violet-200/50 bg-violet-50/50 p-4 text-xs text-violet-800 leading-relaxed dark:border-violet-900/30 dark:bg-violet-950/20 dark:text-violet-300">
          <AlertTriangle className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Caution:</span> Deletion policy and audit settings control UI behavior and soft-delete display visibility globally. Backend constraints remain the source of truth for validation checks.
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Log Retention Days */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
              Log Retention Period (Days)
            </label>
            <input
              type="number"
              min="0"
              value={settings.logRetentionDays}
              disabled={!isEditing}
              onChange={(e) => handleChange("logRetentionDays", e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <span className="text-[10px] text-muted-foreground block">
              Configures log cleanup intervals. 0 keeps history indefinitely.
            </span>
          </div>
        </div>

        {/* Toggles Area */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
            Audit Trail & Safety Toggles
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Track Edits */}
            <div className="flex items-center justify-between p-4 rounded-xl border transition-colors bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Track Updates in Activity Log</span>
                <span className="text-xs text-muted-foreground">Toggles telemetry auditing of update/modification events in the system-wide activity log.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("trackEdits")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.trackEdits ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.trackEdits ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Show Deleted Records */}
            <div className="flex items-center justify-between p-4 rounded-xl border transition-colors bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Show Deleted Records</span>
                <span className="text-xs text-muted-foreground">Allows soft-deleted intake, sale, and invoice records to remain visible in UI tables.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("showDeletedRecords")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.showDeletedRecords ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.showDeletedRecords ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Allow Destructive Delete */}
            <div className="flex items-center justify-between p-4 rounded-xl border transition-colors bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Allow Destructive Deletes</span>
                <span className="text-xs text-muted-foreground">Enables permanent database row deletion buttons in administrative control panels.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("allowDestructiveDelete")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.allowDestructiveDelete ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    settings.allowDestructiveDelete ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </form>

      {showDestructiveModal && (
        <DestructiveModeModal
          onClose={() => setShowDestructiveModal(false)}
          onSuccess={handleDestructiveModeSuccess}
        />
      )}
    </div>
  );
}
