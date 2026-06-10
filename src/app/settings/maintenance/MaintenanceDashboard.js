"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Database, Upload, Import, ShieldAlert, Sliders, RefreshCw, Trash2, Download } from "lucide-react";
import BackupTab from "@/modules/maintenance/ui/BackupTab";
import RestoreTab from "@/modules/maintenance/ui/RestoreTab";
import ImportDataTab from "@/modules/maintenance/ui/ImportDataTab";
import HistoricalImportTab from "@/modules/data-import/ui/HistoricalImportTab";
import ResetSystemTab from "@/modules/maintenance/ui/ResetSystemTab";
import InventoryToolsTab from "@/modules/maintenance/ui/InventoryToolsTab";
import LedgerToolsTab from "@/modules/maintenance/ui/LedgerToolsTab";
import LogsCleanupTab from "@/modules/maintenance/ui/LogsCleanupTab";
import ExportTab from "@/modules/maintenance/ui/ExportTab";

export default function MaintenanceDashboard() {
  const [activeTab, setActiveTab] = useState("backup");

  const tabs = [
    { id: "backup", label: "Backup Database", icon: Database, component: BackupTab },
    { id: "restore", label: "Restore Database", icon: Upload, component: RestoreTab },
    { id: "import", label: "Import Data", icon: Import, component: ImportDataTab },
    { id: "historical", label: "Historical Onboarding", icon: Import, component: HistoricalImportTab },
    { id: "export", label: "Data Export", icon: Download, component: ExportTab },
    { id: "reset", label: "Reset Demo Data", icon: ShieldAlert, component: ResetSystemTab },
    { id: "inventory", label: "Inventory Rebuild", icon: Sliders, component: InventoryToolsTab },
    { id: "ledger", label: "Ledger Rebuild", icon: RefreshCw, component: LedgerToolsTab },
    { id: "logs", label: "Logs Cleanup", icon: Trash2, component: LogsCleanupTab },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || BackupTab;


  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href="/settings"
              className="p-1 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors mr-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">System Maintenance & Backups</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-8">Perform administrative recovery tasks, database imports, resets, and calculations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left Navigation */}
        <div className="md:col-span-1 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Tab Content */}
        <div className="md:col-span-4">
          <div className="animate-in fade-in duration-200">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
