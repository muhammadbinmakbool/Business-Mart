"use client";

import React, { useState } from "react";
import { Download, Loader2, Database } from "lucide-react";
import { exportDatabaseAction } from "../controllers/maintenanceActions";
import { toast } from "sonner";

export default function BackupTab() {
  const [isExporting, setIsExporting] = useState(false);

  const handleBackup = async () => {
    setIsExporting(true);
    try {
      const res = await exportDatabaseAction();
      if (res.success) {
        const jsonString = JSON.stringify(res.backup, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        const dateStr = new Date().toISOString().replace(/T/, "_").replace(/\..+/, "").replace(/:/g, "-");
        a.href = url;
        a.download = `BusinessMart_Backup_${dateStr}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        toast.success("Database backup generated and downloaded successfully!");
      } else {
        toast.error(res.error || "Failed to generate backup");
      }
    } catch (err) {
      toast.error("An error occurred during database export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-primary/10 text-primary rounded-xl">
          <Database className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-card-foreground">Export Database Backup</h2>
          <p className="text-xs text-muted-foreground">Download a complete snapshot of all tables, settings, records, and audit logs.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl bg-accent/40 p-4 border text-sm text-card-foreground leading-relaxed">
          <h3 className="font-bold text-sm mb-1 text-primary">Backup Integrity Information:</h3>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            <li>Includes all products, parties, transactions, ledger snapshots, and settings.</li>
            <li>Stored in a portable, schema-validated JSON formatting standard.</li>
            <li>Perfect for migration, lifecycle restoration, or local recovery.</li>
          </ul>
        </div>

        <button
          onClick={handleBackup}
          disabled={isExporting}
          className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-sm cursor-pointer"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating Snapshot...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Generate & Download Backup
            </>
          )}
        </button>
      </div>
    </div>
  );
}
