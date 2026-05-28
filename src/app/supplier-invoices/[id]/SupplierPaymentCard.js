"use client";

import React, { useState } from "react";
import { Coins, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { recordSupplierPaymentAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";

export default function SupplierPaymentCard({ invoice }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const total = Number(invoice.finalPayableAmount || 0);
  const paid = Number(invoice.paidAmount || 0);
  const remaining = Math.max(0, total - paid);
  const percentPaid = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const isCleared = invoice.status === "CLEARED" || invoice.paymentStatus === "CLEARED";
  const isSuperseded = invoice.status === "SUPERSEDED";

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);

    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount greater than zero");
      return;
    }

    if (amt > remaining) {
      toast.error(`Amount cannot exceed the remaining outstanding balance of Rs. ${remaining.toLocaleString()}`);
      return;
    }

    setLoading(true);
    try {
      const result = await recordSupplierPaymentAction(invoice.id, amt);
      if (result.success) {
        toast.success(`Successfully recorded payout of Rs. ${amt.toLocaleString()}`);
        setAmount("");
        setShowInput(false);
      } else {
        toast.error(result.error || "Failed to record payment");
      }
    } catch (error) {
      toast.error("An unexpected error occurred while recording payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-3">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          Clearance Status
        </h3>
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border",
          isCleared ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
          isSuperseded ? "bg-rose-50 text-rose-700 border-rose-200" :
          paid > 0 ? "bg-blue-50 text-blue-700 border-blue-200" :
          "bg-amber-50 text-amber-700 border-amber-200"
        )}>
          {isCleared ? "CLEARED" : isSuperseded ? "SUPERSEDED" : paid > 0 ? "PARTIAL" : "PENDING"}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Payout Progress</span>
          <span className="text-primary font-bold">{percentPaid}%</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              isCleared ? "bg-emerald-500" : paid > 0 ? "bg-blue-500" : "bg-amber-500"
            )}
            style={{ width: `${percentPaid}%` }}
          />
        </div>
      </div>

      {/* Financial Details Grid */}
      <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
        <div className="bg-muted/10 p-3 rounded-xl border border-muted/20">
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Paid to Supplier</div>
          <div className="text-base font-black text-foreground mt-1">
            Rs. {paid.toLocaleString()}
          </div>
        </div>
        <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
          <div className="text-[10px] uppercase font-bold text-primary tracking-wider">Remaining Outstanding</div>
          <div className={cn(
            "text-base font-black mt-1",
            remaining > 0 ? "text-primary" : "text-emerald-600"
          )}>
            Rs. {remaining.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Input / Form Control */}
      {!isCleared && !isSuperseded && (
        <div className="pt-2">
          {!showInput ? (
            <button
              onClick={() => setShowInput(true)}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl text-xs uppercase tracking-wider shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2"
            >
              Record Payment
            </button>
          ) : (
            <form onSubmit={handleRecordPayment} className="space-y-3 border-t pt-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Payout Amount (Rs.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    max={remaining}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`e.g. ${Math.min(remaining, 5000)}`}
                    disabled={loading}
                    className="w-full px-3.5 py-2 border rounded-xl bg-card font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/45"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(remaining.toString())}
                    className="absolute right-2 top-1.5 px-2 py-1 bg-muted/60 hover:bg-muted text-[10px] font-bold rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    title="Pay exact remaining balance"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInput(false);
                    setAmount("");
                  }}
                  disabled={loading}
                  className="flex-1 py-2 px-3 border border-muted hover:bg-muted/40 font-semibold rounded-xl text-xs uppercase tracking-wider text-muted-foreground transition-all duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-3 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl text-xs uppercase tracking-wider shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Cleared Friendly State */}
      {isCleared && (
        <div className="bg-emerald-50 border border-emerald-200/50 rounded-xl p-3 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-800">
            <div className="font-bold">Fully Cleared</div>
            <div className="mt-0.5 opacity-90">All outstanding payouts for this settlement invoice have been recorded.</div>
          </div>
        </div>
      )}

      {/* Superseded Friendly State */}
      {isSuperseded && (
        <div className="bg-rose-50 border border-rose-200/50 rounded-xl p-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800">
            <div className="font-bold">Superseded Version</div>
            <div className="mt-0.5 opacity-90">This is an older version of the settlement. Payout recording is disabled on historical records.</div>
          </div>
        </div>
      )}
    </div>
  );
}
