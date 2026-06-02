"use client";

import React, { useState } from "react";
import { ShieldCheck, Loader2, Info } from "lucide-react";
import { cleanupLogsAction } from "../controllers/maintenanceActions";
import { toast } from "sonner";

export default function LogsCleanupTab() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCleanup = async () => {
    setIsProcessing(true);
    try {
      const res = await cleanupLogsAction();
      if (res.success) {
        toast.success(`Pruned ${res.deletedCount} old audit log entries successfully!`);
      } else {
        toast.error(res.error || "Failed to prune activity logs");
      }
    } catch (err) {
      toast.error("An error occurred during log pruning");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-card-foreground">Audit Logs Housekeeping</h2>
          <p className="text-xs text-muted-foreground">Purge older activity log records to maintain database efficiency.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-amber-500/5 p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-800">Retention Rules Applied</h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              Pruning logs will delete entries older than the configured limit in Activity & Audit Settings (e.g. 30 days). Active sessions and recent logs will not be affected.
            </p>
          </div>
        </div>

        <button
          onClick={handleCleanup}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 w-full md:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-550 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Pruning Audit Logs...
            </>
          ) : (
            "Prune Old Activity Logs"
          )}
        </button>
      </div>
    </div>
  );
}
