"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Sliders, Check, ShieldAlert, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getFeatureFlagsAction, saveFeatureFlagsAction } from "@/modules/settings/controllers/settingsActions";
import { checkReauthStatusAction } from "@/modules/auth/controllers/userActions";
import PasswordConfirmModal from "@/components/ui/PasswordConfirmModal";

export default function FeatureFlagCard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [flags, setFlags] = useState({
    intakeMode: "RECEIPT",
    salesWorkflow: "CLASSIC",
    salesMode: "HYBRID",
    enableIntakeLinking: true,
    enablePrefilledInvoices: true,
    enableWorkbenchSuggestions: true,
    modules: {
      sourceTracking: true,
      batchTracking: true,
      supplierMapping: true
    },
    features: {
      gst: true,
      discount: true
    }
  });

  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  // Re-auth confirmation modal states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmDescription, setConfirmDescription] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    async function loadFlags() {
      const res = await getFeatureFlagsAction();
      if (res.success) {
        setFlags({
          ...res.flags,
          intakeMode: res.flags.intakeMode || "RECEIPT",
          salesMode: res.flags.salesMode || "HYBRID",
          enableIntakeLinking: res.flags.enableIntakeLinking !== undefined ? res.flags.enableIntakeLinking : true,
          enablePrefilledInvoices: res.flags.enablePrefilledInvoices !== undefined ? res.flags.enablePrefilledInvoices : true,
          enableWorkbenchSuggestions: res.flags.enableWorkbenchSuggestions !== undefined ? res.flags.enableWorkbenchSuggestions : true,
        });
      } else {
        toast.error("Failed to load feature flags from database.");
      }
      setMounted(true);
    }
    loadFlags();
  }, []);

  const handleWorkflowChange = (e) => {
    setFlags((prev) => ({
      ...prev,
      salesWorkflow: e.target.value
    }));
  };

  const handleSalesModeChange = (e) => {
    setFlags((prev) => ({
      ...prev,
      salesMode: e.target.value
    }));
  };

  const handleIntakeModeChange = (e) => {
    setFlags((prev) => ({
      ...prev,
      intakeMode: e.target.value
    }));
  };

  const handleToggle = (key) => {
    setFlags((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleModuleToggle = (moduleKey) => {
    setFlags((prev) => ({
      ...prev,
      modules: {
        ...prev.modules,
        [moduleKey]: !prev.modules[moduleKey]
      }
    }));
  };

  const handleFeatureToggle = (featureKey) => {
    setFlags((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [featureKey]: !prev.features[featureKey]
      }
    }));
  };

  const executeSave = async (confirmPassword) => {
    setSaving(true);
    const res = await saveFeatureFlagsAction(flags, confirmPassword);
    setSaving(false);
    
    if (res.success) {
      toast.success("Feature flags saved successfully!");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to save feature flags.");
      throw new Error(res.error || "Failed to save feature flags.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Re-auth check
    const isReauthCached = await checkReauthStatusAction();
    if (isReauthCached) {
      try {
        await executeSave("");
      } catch (err) {
        // Error already toasted in executeSave
      }
      return;
    }

    setConfirmTitle("Confirm Feature Flags Update");
    setConfirmDescription(
      "Modifying system-wide feature flags can alter user workflows and hide active subsystems. Please confirm your password to proceed."
    );
    setIsConfirmOpen(true);
  };

  const handlePasswordConfirmed = async (confirmPassword) => {
    setConfirmLoading(true);
    try {
      await executeSave(confirmPassword);
      setIsConfirmOpen(false);
    } catch (e) {
      // Handled in executeSave
    } finally {
      setConfirmLoading(false);
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

  const activeSourceTracking = 
    flags.salesMode === "TRACKED" 
      ? true 
      : flags.salesMode === "DIRECT" 
        ? false 
        : !!flags.modules?.sourceTracking;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">Feature Flags & Modules</h3>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Feature Flags"}
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Deploy capability switches across Business Mart deployments. Feature flags act as modular guards to control routing, navigation visibility, and field selections.
      </p>

      {/* Caution Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200/50 bg-amber-50/50 p-4 text-xs text-amber-800 leading-relaxed dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Caution:</span> Disabling a module or workflow (e.g. POS or Source Tracking) will restrict route access for all system users and hide menu links. However, active database records and ledger balance entries remain safe.
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Sales & Intake Operational Configurations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
              Sales / Billing Workflow UI
            </label>
            <select
              value={flags.salesWorkflow}
              onChange={handleWorkflowChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="CLASSIC">Classic Billing Form</option>
              <option value="POS">Point of Sale (POS) Terminal</option>
            </select>
            <span className="text-[10px] text-muted-foreground block">
              Controls the user interface and keyboard behavior when creating new buyer invoices.
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
              Sales Operational Mode (SALES_MODE)
            </label>
            <select
              value={flags.salesMode}
              onChange={handleSalesModeChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="DIRECT">Direct Mode (No Tracking)</option>
              <option value="TRACKED">Tracked Mode (Mandatory Tracking)</option>
              <option value="HYBRID">Hybrid Mode (Optional Tracking)</option>
            </select>
            <span className="text-[10px] text-muted-foreground block">
              Governs whether invoice items must be traced back to supplier intakes.
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider block">
              Intake Operational Mode
            </label>
            <select
              value={flags.intakeMode}
              onChange={handleIntakeModeChange}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="RECEIPT">Receipt Mode (Classic Grain)</option>
              <option value="PURCHASE">Purchase Mode (Generalized)</option>
            </select>
            <span className="text-[10px] text-muted-foreground block">
              Governs whether arrivals are crops for commission sales or direct stock purchases.
            </span>
          </div>
        </div>

        {/* Workflow Toggles */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
            Sales Workflow Configuration Toggles
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Enable Intake Linking */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Intake Linking UI</span>
                <span className="text-[10px] text-muted-foreground">Expose intake matching selections in billing forms.</span>
              </div>
              <button
                type="button"
                disabled={flags.salesMode === "DIRECT"}
                onClick={() => handleToggle("enableIntakeLinking")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  flags.salesMode !== "DIRECT" && flags.enableIntakeLinking ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    flags.salesMode !== "DIRECT" && flags.enableIntakeLinking ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Enable Prefilled Invoices */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Prefilled Draft Invoices</span>
                <span className="text-[10px] text-muted-foreground">Auto-generate suggested drafts for unbilled sales.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("enablePrefilledInvoices")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  flags.enablePrefilledInvoices ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    flags.enablePrefilledInvoices ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Enable Workbench Suggestions */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Workbench Suggestions</span>
                <span className="text-[10px] text-muted-foreground">Expose suggested cards inside the Sales Workbench.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle("enableWorkbenchSuggestions")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  flags.enableWorkbenchSuggestions ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    flags.enableWorkbenchSuggestions ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* System Module Switches */}
        <div className="border-t pt-6 space-y-4">
          <h4 className="text-xs font-extrabold uppercase text-muted-foreground tracking-widest">
            System Modules Configuration
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Source Tracking */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Source Tracking Register</span>
                <span className="text-xs text-muted-foreground">
                  {flags.salesMode === "TRACKED" 
                    ? "Forced ON in TRACKED mode." 
                    : flags.salesMode === "DIRECT" 
                      ? "Forced OFF in DIRECT mode." 
                      : "Allows tracing sale transactions back to source supplier intakes."}
                </span>
              </div>
              <button
                type="button"
                disabled={flags.salesMode !== "HYBRID"}
                onClick={() => handleModuleToggle("sourceTracking")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  activeSourceTracking ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    activeSourceTracking ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Supplier Mapping capability */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Supplier Mapping</span>
                <span className="text-xs text-muted-foreground">Enables creation and editing of active supplier-buyer purchase associations.</span>
              </div>
              <button
                type="button"
                onClick={() => handleModuleToggle("supplierMapping")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  flags.modules?.supplierMapping ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    flags.modules?.supplierMapping ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Batch Tracking */}
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-semibold block">Batch Tracking</span>
                <span className="text-xs text-muted-foreground">Exposes product consignment batching and lot numbers across forms.</span>
              </div>
              <button
                type="button"
                onClick={() => handleModuleToggle("batchTracking")}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  flags.modules?.batchTracking ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    flags.modules?.batchTracking ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>


      </form>

      {/* Password Confirmation Modal */}
      <PasswordConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handlePasswordConfirmed}
        title={confirmTitle}
        description={confirmDescription}
        confirmLoading={confirmLoading}
      />
    </div>
  );
}
