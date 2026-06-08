"use client";

import React, { useState } from "react";
import { Sliders, Loader2, Sparkles } from "lucide-react";
import { recalculateInventoryAction } from "../controllers/maintenanceActions";
import { toast } from "sonner";

export default function InventoryToolsTab() {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRecalculate = async () => {
    setIsProcessing(true);
    try {
      const res = await recalculateInventoryAction();
      if (res.success) {
        toast.success(`Inventory recalculated successfully for ${res.count} products!`);
      } else {
        toast.error(res.error || "Failed to recalculate inventory");
      }
    } catch (err) {
      toast.error("An error occurred during inventory recalculation");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
          <Sliders className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-card-foreground">Inventory Tools & Stock Rebuild</h2>
          <p className="text-xs text-muted-foreground">Rebuild stock snapshots dynamically from original Intakes & Sales tracks.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-emerald-500/5 p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-emerald-800">Idempotent Stock Rebuild</h4>
            <p className="text-xs text-emerald-700 leading-relaxed">
              This recovery action iterates through all inventory items and reconciles their physical stock counts with active, outstanding intakes. This operation is safe to run repeatedly.
            </p>
          </div>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={isProcessing}
          className="flex items-center justify-center gap-2 w-full md:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Recalculating Stock...
            </>
          ) : (
            "Recalculate All Stock Balances"
          )}
        </button>
      </div>
    </div>
  );
}
