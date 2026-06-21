"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Printer, 
  ArrowRight, 
  ExternalLink,
  Sliders,
  ShieldAlert,
  Database
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";

import UsersManagement from "./UsersManagement";
import DefaultsCard from "./DefaultsCard";
import UnitPrecisionSettingsCard from "./UnitPrecisionSettingsCard";
import UnitManagementCard from "./UnitManagementCard";
import PrintSettingsCard from "./PrintSettingsCard";
import GeneralSettingsCard from "./GeneralSettingsCard";
import InventorySettingsCard from "./InventorySettingsCard";
import SettlementLedgerSettingsCard from "./SettlementLedgerSettingsCard";
import ActivityAuditSettingsCard from "./ActivityAuditSettingsCard";
import IntakeWorkflowSettingsCard from "./IntakeWorkflowSettingsCard";
import { getActiveSessionAction } from "@/modules/auth/controllers/userActions";
import { getFeatureFlagsAction } from "@/modules/settings/controllers/settingsActions";
import FeatureFlagCard from "./FeatureFlagCard";

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [authorized, setAuthorized] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [featureFlags, setFeatureFlags] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      const { canAccessSettings } = await import("@/lib/permissions");
      const session = await getActiveSessionAction();
      if (!session || !canAccessSettings(session.role)) {
        router.push("/dashboard");
      } else {
        setAuthorized(true);
        setUserRole(session.role);
        
        // Fetch feature flags for adjusting adjustments tab
        const flagsRes = await getFeatureFlagsAction();
        if (flagsRes.success) {
          setFeatureFlags(flagsRes.flags);
        }
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const validTabs = [
      "security", "general", "defaults", "print",
      "inventory", "settlement-ledger", "activity-audit", "intake-workflow", "feature-flags"
    ];
    if (validTabs.includes(tab)) {
      if (tab !== "feature-flags" || userRole === "SUPER_ADMIN") {
        setActiveTab(tab);
      }
    }
  }, [searchParams, userRole]);


  if (!authorized) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-muted-foreground animate-pulse text-sm">
        Verifying security access...
      </div>
    );
  }

  const templates = [
    {
      name: "Sale Invoice Template",
      description: "Buyer invoices, product weight breakdowns, and adjustments.",
      type: "sale",
      path: "/print/preview?type=sale"
    },
    {
      name: "Intake Receipt Template",
      description: "Goods arrival receipts, bag counts, and gross/net weights.",
      type: "intake",
      path: "/print/preview?type=intake"
    },
    {
      name: "Supplier Settlement Invoice",
      description: "Final supplier settlements, advances, and aggregated deductions.",
      type: "settlement",
      path: "/print/preview?type=settlement"
    },
    {
      name: "Ledger Report (Landscape)",
      description: "Landscape sheet layout for accounts and reconciliation.",
      type: "ledger",
      path: "/print/preview?type=ledger"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">Manage system configuration, organization profile, user controls, and printing subsystems.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left Navigation Tabs */}
        <div className="md:col-span-1 space-y-1">
          <button 
            onClick={() => setActiveTab("general")}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "general"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Sliders className="h-4 w-4" />
            General Setup
          </button>
          
          <button 
            onClick={() => setActiveTab("security")}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Security & Users
          </button>

          <Link
            href="/settings/adjustments"
            className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Sliders className="h-4 w-4" />
            Adjustments
          </Link>

          <button 
            onClick={() => setActiveTab("defaults")}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "defaults"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Default Products & Units
          </button>

          <button 
            onClick={() => setActiveTab("print")}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "print"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Printer className="h-4 w-4" />
            Print Settings
          </button>

          <button 
            onClick={() => setActiveTab("inventory")}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "inventory"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Inventory Settings
          </button>

          <button 
            onClick={() => setActiveTab("settlement-ledger")}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "settlement-ledger"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Settlement & Ledger
          </button>

          <button 
            onClick={() => setActiveTab("intake-workflow")}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "intake-workflow"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Intake Workflow
          </button>

          <button 
            onClick={() => setActiveTab("activity-audit")}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "activity-audit"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Activity & Audit Settings
          </button>

          {userRole === "SUPER_ADMIN" && (
            <button 
              onClick={() => setActiveTab("feature-flags")}
              className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "feature-flags"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <Sliders className="h-4 w-4" />
              Feature Flags Configuration
            </button>
          )}

          <Link
            href="/settings/maintenance"
            className="w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Database className="h-4 w-4" />
            System Maintenance
          </Link>

        </div>

        {/* Right Content Pane */}
        <div className="md:col-span-4 space-y-6">
          <div className={activeTab === "general" ? "animate-in fade-in duration-200" : "hidden"}>
            <GeneralSettingsCard />
          </div>

          <div className={activeTab === "security" ? "rounded-2xl border bg-card p-6 shadow-sm animate-in fade-in duration-200" : "hidden"}>
            <UsersManagement />
          </div>

          {/* Note: Adjustments are managed at /settings/adjustments for layout consistency */}

          <div className={activeTab === "defaults" ? "space-y-6 animate-in fade-in duration-200" : "hidden"}>
            <DefaultsCard />
            <UnitPrecisionSettingsCard />
            <UnitManagementCard />
          </div>

          <div className={activeTab === "print" ? "space-y-6 animate-in fade-in duration-200" : "hidden"}>
            <PrintSettingsCard />
            
            {/* Card 2: Print Subsystem Customizer */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-bold text-base">Print Subsystem Customization</h3>
                </div>
                <Link
                  href="/print/preview?type=sale"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Launch Editor <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Business Mart features a high-fidelity, styling-isolated print subsystem. Customize, design, and live-preview templates below.
              </p>

              <div className="grid grid-cols-1 gap-4">
                {templates.map((tpl) => (
                  <div
                    key={tpl.type}
                    className="group relative rounded-xl border p-4 hover:bg-muted/30 transition-all flex items-center justify-between"
                  >
                    <div className="space-y-1 pr-4">
                      <h4 className="font-bold text-sm text-card-foreground group-hover:text-primary transition-colors">
                        {tpl.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">{tpl.description}</p>
                    </div>
                    <Link
                      href={tpl.path}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={activeTab === "inventory" ? "animate-in fade-in duration-200" : "hidden"}>
            <InventorySettingsCard />
          </div>

          <div className={activeTab === "settlement-ledger" ? "animate-in fade-in duration-200" : "hidden"}>
            <SettlementLedgerSettingsCard />
          </div>

          <div className={activeTab === "activity-audit" ? "animate-in fade-in duration-200" : "hidden"}>
            <ActivityAuditSettingsCard />
          </div>

          <div className={activeTab === "intake-workflow" ? "animate-in fade-in duration-200" : "hidden"}>
            <IntakeWorkflowSettingsCard />
          </div>

          {userRole === "SUPER_ADMIN" && (
            <div className={activeTab === "feature-flags" ? "animate-in fade-in duration-200" : "hidden"}>
              <FeatureFlagCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto py-16 text-center text-muted-foreground animate-pulse text-sm">
        Loading system settings...
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
