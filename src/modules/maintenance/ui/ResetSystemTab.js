"use client";

import React, { useState } from "react";
import { ShieldAlert, Loader2, AlertTriangle } from "lucide-react";
import { resetSystemAction } from "../controllers/maintenanceActions";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";

export default function ResetSystemTab() {
  const [isResetting, setIsResetting] = useState(false);
  const [keepUsers, setKeepUsers] = useState(true);
  const [keepSettings, setKeepSettings] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleResetClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmReset = async () => {
    if (confirmText !== "RESET") {
      toast.error("Please type 'RESET' to confirm.");
      return;
    }

    setShowConfirm(false);
    setIsResetting(true);
    try {
      const res = await resetSystemAction({ keepUsers, keepSettings });
      if (res.success) {
        toast.success("System reset successfully!");
        setConfirmText("");
      } else {
        toast.error(res.error || "Failed to reset system");
      }
    } catch (err) {
      toast.error("An error occurred during system reset");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-card-foreground">Reset System / Demo Data</h2>
          <p className="text-xs text-muted-foreground">Clear out all transactional records to start with a fresh clean state.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider">Irreversible Action Warning</h4>
            <p className="text-xs text-rose-700 leading-relaxed">
              This action will completely delete all Intakes, Sales, Supplier Invoices, Payments, Ledger reconciliations, and history logs. This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Configuration Toggles */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-bold text-xs text-card-foreground uppercase tracking-wider">Reset Configurations</h3>
          
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h4 className="text-xs font-bold text-card-foreground">Preserve Admin Accounts</h4>
              <p className="text-[10px] text-muted-foreground">Keep administrative users to avoid locked-out scenarios.</p>
            </div>
            <button
              onClick={() => setKeepUsers(!keepUsers)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${
                keepUsers ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all ${
                  keepUsers ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h4 className="text-xs font-bold text-card-foreground">Preserve System Settings</h4>
              <p className="text-[10px] text-muted-foreground">Keep document prints, general profiles, and workflow parameters.</p>
            </div>
            <button
              onClick={() => setKeepSettings(!keepSettings)}
              className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all ${
                keepSettings ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all ${
                  keepSettings ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <button
          onClick={handleResetClick}
          disabled={isResetting}
          className="flex items-center justify-center gap-2 w-full md:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {isResetting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resetting Database...
            </>
          ) : (
            "Reset Live Database"
          )}
        </button>
      </div>

      <Modal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setConfirmText("");
        }}
        title="Authorise Irreversible System Reset"
        description="Type the authorisation word to clear transaction tables."
        type="danger"
        confirmLabel="Confirm System Reset"
        onConfirm={handleConfirmReset}
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            To proceed, type <span className="font-bold text-rose-600">RESET</span> in the box below to authorize the clean slate process:
          </p>
          <input
            type="text"
            required
            placeholder="Type RESET here..."
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 uppercase font-mono font-bold text-rose-600"
          />
        </div>
      </Modal>
    </div>
  );
}
