"use client";

import React, { useState, useEffect } from "react";
import { Download, Loader2, Database, Folder, ShieldAlert } from "lucide-react";
import { 
  exportDatabaseAction, 
  getProviderAction, 
  backupSqliteFileAction 
} from "../controllers/maintenanceActions";
import { toast } from "sonner";

export default function BackupTab() {
  const [isExporting, setIsExporting] = useState(false);
  const [provider, setProvider] = useState("mssql");
  const [sqliteBackupDir, setSqliteBackupDir] = useState("D:\\BusinessMartBackups");
  const [isSqliteExporting, setIsSqliteExporting] = useState(false);

  useEffect(() => {
    async function fetchProvider() {
      const res = await getProviderAction();
      if (res.success) {
        setProvider(res.provider);
      }
    }
    fetchProvider();
  }, []);

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

  const handleSqliteBackup = async () => {
    if (!sqliteBackupDir.trim()) {
      toast.error("Please enter a valid backup folder path");
      return;
    }
    setIsSqliteExporting(true);
    try {
      const res = await backupSqliteFileAction(sqliteBackupDir.trim());
      if (res.success) {
        toast.success(`SQLite database backed up as: ${res.filename}`);
      } else {
        toast.error(res.error || "Failed to backup SQLite file");
      }
    } catch (err) {
      toast.error("An error occurred during SQLite database copy");
    } finally {
      setIsSqliteExporting(false);
    }
  };

  return (
    <div className="space-y-6">
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

      {provider === "sqlite" && (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Folder className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-card-foreground">Physical SQLite Backup</h2>
              <p className="text-xs text-muted-foreground">Directly copy the active SQLite database file to another drive or directory to protect against C:\ failures.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="backup-dir" className="text-xs font-semibold text-muted-foreground">
                Backup Destination Folder (e.g. D:\Backups or E:\LocalBackups):
              </label>
              <input
                id="backup-dir"
                type="text"
                value={sqliteBackupDir}
                onChange={(e) => setSqliteBackupDir(e.target.value)}
                placeholder="Enter backup directory path..."
                className="w-full px-4 py-2.5 rounded-xl border bg-accent/20 text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 border-input"
              />
            </div>

            <div className="rounded-xl bg-amber-500/5 p-4 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Colleague Safety Recommendation:</p>
                <p className="mt-1 leading-relaxed">
                  Never backup to the application's installation folder on the C: drive. 
                  Specify a folder on a secondary partition (e.g. <strong>D:\BusinessMartBackups</strong>). 
                  The backup filename will automatically include a unique timestamp to prevent overwriting existing snapshots.
                </p>
              </div>
            </div>

            <button
              onClick={handleSqliteBackup}
              disabled={isSqliteExporting}
              className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 text-sm cursor-pointer"
            >
              {isSqliteExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Copying Database File...
                </>
              ) : (
                <>
                  <Folder className="h-4 w-4" />
                  Create Physical File Backup
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
