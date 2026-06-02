"use client";

import React, { useState, useRef } from "react";
import { Upload, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { restoreDatabaseAction } from "../controllers/maintenanceActions";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";

export default function RestoreTab() {
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupData, setBackupData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.version || !parsed.data) {
          toast.error("Invalid file structure: missing version or data properties.");
          setBackupData(null);
          return;
        }
        setBackupData(parsed);
      } catch (err) {
        toast.error("Failed to parse JSON file.");
        setBackupData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreClick = () => {
    if (!backupData) return;
    setShowConfirm(true);
  };

  const handleConfirmRestore = async () => {
    if (confirmText !== "RESTORE") {
      toast.error("Please type 'RESTORE' to confirm.");
      return;
    }

    setShowConfirm(false);
    setIsRestoring(true);
    try {
      const res = await restoreDatabaseAction(backupData);
      if (res.success) {
        toast.success("Database restored successfully!");
        setBackupData(null);
        setFileName("");
        setConfirmText("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(res.error || "Failed to restore database");
      }
    } catch (err) {
      toast.error("An error occurred during database restoration");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-card-foreground">Restore Database Snapshot</h2>
          <p className="text-xs text-muted-foreground">Restore the full system state from an existing JSON backup.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-8 flex flex-col items-center justify-center space-y-2 hover:bg-accent/10 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-xs font-semibold text-card-foreground">Click to upload or drag your backup JSON file here</p>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            id="backup-file-upload"
          />
          <label
            htmlFor="backup-file-upload"
            className="px-4 py-2 bg-accent hover:bg-accent/80 text-accent-foreground text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            Choose File
          </label>
          {fileName && (
            <p className="text-xs text-primary font-bold mt-2">Selected: {fileName}</p>
          )}
        </div>

        {backupData && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider">Critical Destruction Warning</h4>
                <p className="text-xs text-amber-700 leading-relaxed mt-1">
                  Restoring will completely overwrite the current system tables. Any unbacked data will be permanently lost.
                </p>
              </div>
            </div>

            <button
              onClick={handleRestoreClick}
              disabled={isRestoring}
              className="flex items-center justify-center gap-2 w-full md:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isRestoring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restoring Database...
                </>
              ) : (
                "Initiate Restore Operation"
              )}
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setConfirmText("");
        }}
        title="Confirm Irreversible Database Restore"
        description="This action will delete and replace all active system tables."
        type="danger"
        confirmLabel="Overwrite Database"
        onConfirm={handleConfirmRestore}
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            To proceed, type <span className="font-bold text-rose-600">RESTORE</span> in the box below to authorize overwriting the live database:
          </p>
          <input
            type="text"
            required
            placeholder="Type RESTORE here..."
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase font-mono font-bold text-rose-600"
          />
        </div>
      </Modal>
    </div>
  );
}
