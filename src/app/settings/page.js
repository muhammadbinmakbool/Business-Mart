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
import DisplayUnitSettingsCard from "./DisplayUnitSettingsCard";
import UsersManagement from "./UsersManagement";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

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
    <div className={`mx-auto space-y-8 pb-16 transition-all duration-300 ${
      activeTab === "security" ? "max-w-7xl" : "max-w-5xl"
    }`}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground">Manage system configuration, organization profile, user controls, and printing subsystems.</p>
      </div>

      <div className={`grid grid-cols-1 gap-6 transition-all duration-300 ${
        activeTab === "security" ? "md:grid-cols-5" : "md:grid-cols-4"
      }`}>
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

          <button className="w-full text-left px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground flex items-center gap-2 opacity-40 cursor-not-allowed" disabled>
            <Building2 className="h-4 w-4" />
            Branding Profile
          </button>
        </div>

        {/* Right Content Pane */}
        <div className={`space-y-6 transition-all duration-300 ${
          activeTab === "security" ? "md:col-span-4" : "md:col-span-3"
        }`}>
          {activeTab === "general" && (
            <>
              {/* Card 1: Branding Information */}
              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 border-b pb-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-base">Organization Profile</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Business Name</span>
                    <div className="font-bold">Rehmania & Company Grain Market</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium">Contact Phone</span>
                    <div className="font-semibold">+92 300 1234567</div>
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <span className="text-xs text-muted-foreground font-medium">Address</span>
                    <div className="font-semibold">Grain Market, Ghalla Mandi, Punjab, Pakistan</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic pt-2">
                  Note: Branding settings are currently read-only and loaded from the print configuration module.
                </p>
              </div>

              {/* Card 1.5: UI Display Unit Preferences */}
              <div className="animate-in fade-in duration-200">
                <DisplayUnitSettingsCard />
              </div>

              {/* Card 2: Print Subsystem Customizer */}
              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
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
            </>
          )}

          {activeTab === "security" && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm animate-in fade-in duration-200">
              <UsersManagement />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
