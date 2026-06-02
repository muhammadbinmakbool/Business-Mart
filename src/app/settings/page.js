"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  Printer, 
  ArrowRight, 
  ExternalLink,
  Sliders,
  ShieldAlert
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import DisplayUnitSettingsCard from "./DisplayUnitSettingsCard";
import UsersManagement from "./UsersManagement";
import AdjustmentVisibilityCard from "./AdjustmentVisibilityCard";
import DefaultsCard from "./DefaultsCard";
import PrintSettingsCard from "./PrintSettingsCard";
import GeneralSettingsCard from "./GeneralSettingsCard";
import InventorySettingsCard from "./InventorySettingsCard";
import SettlementLedgerSettingsCard from "./SettlementLedgerSettingsCard";
import { getActiveSessionAction } from "@/modules/auth/controllers/userActions";

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("general");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { canAccessSettings } = await import("@/lib/permissions");
      const session = await getActiveSessionAction();
      if (!session || !canAccessSettings(session.role)) {
        router.push("/dashboard");
      } else {
        setAuthorized(true);
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "security" || tab === "general" || tab === "adjustments" || tab === "defaults" || tab === "print" || tab === "inventory" || tab === "settlement-ledger") {
      setActiveTab(tab);
    }
  }, [searchParams]);


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

          <button 
            onClick={() => setActiveTab("adjustments")}
            className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === "adjustments"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Adjustments Visibility
          </button>

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

          <button className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground flex items-center gap-2 opacity-40 cursor-not-allowed" disabled>
            <Building2 className="h-4 w-4" />
            Branding Profile
          </button>
        </div>

        {/* Right Content Pane */}
        <div className="md:col-span-4 space-y-6">
          {activeTab === "general" && (
            <div className="animate-in fade-in duration-200">
              <GeneralSettingsCard />
            </div>
          )}

          {activeTab === "security" && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm animate-in fade-in duration-200">
              <UsersManagement />
            </div>
          )}

          {activeTab === "adjustments" && (
            <div className="animate-in fade-in duration-200">
              <AdjustmentVisibilityCard />
            </div>
          )}

          {activeTab === "defaults" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <DefaultsCard />
              <DisplayUnitSettingsCard />
            </div>
          )}

          {activeTab === "print" && (
            <div className="space-y-6 animate-in fade-in duration-200">
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
          )}

          {activeTab === "inventory" && (
            <div className="animate-in fade-in duration-200">
              <InventorySettingsCard />
            </div>
          )}

          {activeTab === "settlement-ledger" && (
            <div className="animate-in fade-in duration-200">
              <SettlementLedgerSettingsCard />
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
