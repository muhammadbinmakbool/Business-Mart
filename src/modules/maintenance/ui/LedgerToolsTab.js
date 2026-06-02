"use client";

import React, { useState } from "react";
import { Sliders, Loader2, RefreshCw } from "lucide-react";
import { rebuildLedgerSnapshotsAction } from "../controllers/maintenanceActions";
import { toast } from "sonner";

export default function LedgerToolsTab() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRebuild = async () => {
    setIsProcessing(true);
    try {
      const res = await rebuildLedgerSnapshotsAction();
      if (res.success) {
        toast.success(`Ledger snapshots rebuilt successfully for ${res.count} reconciliation sessions!`);
      } else {
        toast.error(res.error || "Failed to rebuild ledger snapshots");
      }
    } catch (err) {
      toast.error("An error occurred during ledger rebuild");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
          <Sliders className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-card-foreground">Ledger Rebuild & Audit Tools</h2>
          <p className="text-xs text-muted-foreground">Recalculate saved ledger period summaries and resolve drift indicators.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-blue-500/5 p-4 flex items-start gap-3">
          <RefreshCw className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-blue-800">Idempotent Ledger Period Rebuild</h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              This action reviews all saved reconciliation periods (Ledger Sessions) and recalculates their totals from the current state of active supplier and buyer invoices. This eliminates any database totals drift safely.
            </p>
          </div>
        </div>

        <button
          onClick={handleRebuild}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 w-full md:w-auto px-5 py-2.5 bg-blue-655 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Rebuilding Ledger snapshots...
            </>
          ) : (
            "Rebuild Saved Ledger Snapshots"
          )}
        </button>
      </div>
    </div>
  );
}
