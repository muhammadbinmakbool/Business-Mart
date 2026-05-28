"use client";

import React, { useState } from "react";
import { Coins, CheckCircle, AlertCircle, Loader2, ReceiptText, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { recordSalePaymentAction } from "@/modules/sales/controllers/saleActions";

export default function SalePaymentCard({ sale }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const total = Number(sale.finalAmount || 0);
  const paid = Number(sale.paidAmount || 0);
  const remaining = Math.max(0, total - paid);
  const percentPaid = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const isCleared = sale.status === "CLEARED" || sale.paymentStatus === "CLEARED";
  const isCancelled = sale.status === "CANCELLED";

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
      const result = await recordSalePaymentAction(sale.id, amt);
      if (result.success) {
        toast.success(`Successfully recorded payment of Rs. ${amt.toLocaleString()}`);
        setAmount("");
        setShowInput(false);
      } else {
        toast.error(result.error || "Failed to record payment");
      }
    } catch (error) {
      toast.error("An unexpected error occurred while recording payment");
    } finally {
      loading && setLoading(false); // check standard safety
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col justify-between">
      {/* 1. Unified Financial Header Banner */}
      <div className="bg-primary p-6 text-primary-foreground relative overflow-hidden flex flex-col justify-between min-h-[140px]">
        <ReceiptText className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 rotate-12" />
        <div className="relative z-10">
          <span className="text-[9px] uppercase font-bold opacity-60 tracking-widest block">Final Invoice Total</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xs opacity-80">Rs.</span>
            <h2 className="text-3xl font-black tracking-tighter">{total.toLocaleString()}</h2>
          </div>
        </div>
        <div className="relative z-10 pt-3 border-t border-white/20 mt-3 text-[11px] space-y-1">
          <div className="flex justify-between items-center opacity-85">
            <span>Base Gross Amount</span>
            <span className="font-semibold">Rs. {sale.baseAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center opacity-85">
            <span>Total Adjustments</span>
            <span className="font-semibold">{sale.totalAdjustments >= 0 ? "+" : ""} Rs. {sale.totalAdjustments.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 2. Unified Clearance Status & Actions body */}
      <div className="p-6 space-y-5 flex-1">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            Clearance Status
          </h3>
          <span className={cn(
            "px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border",
            isCleared ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            isCancelled ? "bg-rose-50 text-rose-700 border-rose-200" :
            paid > 0 ? "bg-blue-50 text-blue-700 border-blue-200" :
            "bg-amber-50 text-amber-700 border-amber-200"
          )}>
            {isCleared ? "CLEARED" : isCancelled ? "CANCELLED" : paid > 0 ? "PARTIAL" : "PENDING"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Clearance Progress</span>
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
        <div className="grid grid-cols-2 gap-4 pt-1 text-xs">
          <div className="bg-muted/20 p-3 rounded-xl border border-muted/10">
            <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Total Received</div>
            <div className="text-sm font-black text-foreground mt-1">
              Rs. {paid.toLocaleString()}
            </div>
          </div>
          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
            <div className="text-[9px] uppercase font-bold text-primary tracking-wider">Remaining Balance</div>
            <div className={cn(
              "text-sm font-black mt-1",
              remaining > 0 ? "text-primary" : "text-emerald-600"
            )}>
              Rs. {remaining.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Input / Form Control */}
        {!isCleared && !isCancelled && (
          <div className="pt-1">
            {!showInput ? (
              <button
                onClick={() => setShowInput(true)}
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl text-xs uppercase tracking-wider shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-2"
              >
                Record Receipt
              </button>
            ) : (
              <form onSubmit={handleRecordPayment} className="space-y-3 border-t pt-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Amount Received (Rs.)
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
              <div className="font-bold">Fully Settled</div>
              <div className="mt-0.5 opacity-90">All outstanding obligations for this invoice have been cleared.</div>
            </div>
          </div>
        )}

        {/* Cancelled Friendly State */}
        {isCancelled && (
          <div className="bg-rose-50 border border-rose-200/50 rounded-xl p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800">
              <div className="font-bold">Invoice Cancelled</div>
              <div className="mt-0.5 opacity-90">Payments are disabled for this transaction as the invoice is cancelled.</div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Unified Buyer Info Footer */}
      <div className="p-4 bg-muted/10 flex items-center gap-3 border-t">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs truncate">{sale.party.name}</div>
          <div className="text-[10px] text-muted-foreground leading-none">{format(new Date(sale.entryDate), "dd MMM yyyy")}</div>
        </div>
      </div>
    </div>
  );
}
