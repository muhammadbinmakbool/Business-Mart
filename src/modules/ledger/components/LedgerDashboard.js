import React from "react";
import { CheckCircle2, AlertTriangle, ArrowRightLeft, DollarSign, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LedgerDashboard({ summary, drift = null, isSavedSession = false }) {
  const { supplier, buyer, difference, matched, tolerance } = summary;

  // Formatting helper
  const formatRs = (val) => {
    return `Rs. ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const hasDrift = drift && drift.hasDrift;

  return (
    <div className="space-y-6">
      {/* Drift Warning Banner if detected */}
      {isSavedSession && hasDrift && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm">DRIFT DETECTED</h3>
              <p className="text-xs text-rose-700 mt-1">
                The transactions in this period have been retroactively modified or deleted since this session was saved.
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-rose-200 pt-3 text-xs">
                <div>
                  <span className="font-semibold block text-rose-800">Supplier Base:</span>
                  <span className="line-through block text-rose-500">Saved: {formatRs(summary.supplier.baseTotal)}</span>
                  <span className="font-bold block text-rose-900">Live: {formatRs(drift.liveSupplierTotal)} (Diff: {formatRs(drift.supplierDiff)})</span>
                </div>
                <div>
                  <span className="font-semibold block text-rose-800">Buyer Base:</span>
                  <span className="line-through block text-rose-500">Saved: {formatRs(summary.buyer.baseTotal)}</span>
                  <span className="font-bold block text-rose-900">Live: {formatRs(drift.liveBuyerTotal)} (Diff: {formatRs(drift.buyerDiff)})</span>
                </div>
                <div>
                  <span className="font-semibold block text-rose-800">Difference:</span>
                  <span className="line-through block text-rose-500">Saved: {formatRs(summary.difference)}</span>
                  <span className="font-bold block text-rose-900">Live: {formatRs(drift.liveDifference)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Match Status Card */}
        <div className={cn(
          "rounded-xl border p-5 shadow-sm transition-all duration-300 relative overflow-hidden flex flex-col justify-between",
          matched 
            ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-900 dark:text-emerald-300"
            : "border-rose-200 bg-rose-50/40 dark:bg-rose-950/10 text-rose-900 dark:text-rose-300"
        )}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Reconciliation Status
              </span>
              <span className="text-2xl font-black mt-2 block tracking-tight">
                {matched ? "MATCHED" : "MISMATCH"}
              </span>
            </div>
            {matched ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-500 shrink-0" />
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-dashed border-muted-foreground/20 text-xs">
            Tolerance: <span className="font-semibold">{formatRs(tolerance)}</span>
          </div>
        </div>

        {/* Supplier Side Total Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm text-card-foreground flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Supplier Base Total</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-2xl font-black mt-2 block text-primary tracking-tight">
              {formatRs(supplier.baseTotal)}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-dashed border-muted/50 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
            <div>
              <span className="block font-semibold">Gross:</span>
              <span className="block font-medium truncate">{formatRs(supplier.gross)}</span>
            </div>
            <div>
              <span className="block font-semibold">Deductions:</span>
              <span className="block font-medium truncate">-{formatRs(supplier.deductions)}</span>
            </div>
            <div>
              <span className="block font-semibold">Invoices:</span>
              <span className="block font-medium text-foreground">{supplier.activeCount}</span>
            </div>
          </div>
        </div>

        {/* Buyer Side Total Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm text-card-foreground flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Buyer Base Total</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-2xl font-black mt-2 block text-primary tracking-tight">
              {formatRs(buyer.baseTotal)}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-dashed border-muted/50 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground">
            <div>
              <span className="block font-semibold">Base:</span>
              <span className="block font-medium truncate">{formatRs(buyer.base)}</span>
            </div>
            <div>
              <span className="block font-semibold">Adjustments:</span>
              <span className="block font-medium truncate">{buyer.adjustments >= 0 ? "+" : ""}{formatRs(buyer.adjustments)}</span>
            </div>
            <div>
              <span className="block font-semibold">Invoices:</span>
              <span className="block font-medium text-foreground">{buyer.activeCount}</span>
            </div>
          </div>
        </div>

        {/* Difference Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm text-card-foreground flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Operational Difference</span>
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className={cn(
              "text-2xl font-black mt-2 block tracking-tight",
              matched ? "text-emerald-600 dark:text-emerald-500" : "text-rose-600 dark:text-rose-500"
            )}>
              {formatRs(difference)}
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-dashed border-muted/50 text-[10px] text-muted-foreground flex justify-between items-center">
            <span>Supplier Cash Advances:</span>
            <span className="font-bold text-foreground">{formatRs(supplier.advances)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
