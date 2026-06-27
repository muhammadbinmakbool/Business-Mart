import React from "react";
import Link from "next/link";
import { CheckCircle2, Plus, Receipt, LayoutDashboard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PurchaseSuccessPage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const purchaseId = params.id;

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="rounded-3xl border bg-card/60 backdrop-blur-sm shadow-xl p-8 text-center space-y-6 flex flex-col items-center">
        {/* Success Icon */}
        <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full">
          <CheckCircle2 className="h-16 w-16" />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Purchase Document Recorded</h1>
          <p className="text-muted-foreground text-sm">
            The transaction has been successfully processed and verified.
          </p>
          <div className="inline-flex bg-muted/60 text-foreground font-mono font-bold text-sm px-4 py-2 rounded-xl border border-dashed mt-2">
            ID: {purchaseId}
          </div>
        </div>

        {/* Info Banner */}
        <div className="w-full text-xs bg-primary/5 text-primary border border-primary/10 rounded-2xl p-4 text-left font-medium leading-relaxed">
          <p className="font-bold mb-1">📢 Phase 1 Mock Confirmation</p>
          This is a presentation-only success screen for Phase 1. The transaction details were validated, logged to the server console, and the UI component boundaries successfully verified.
        </div>

        {/* Actions Button List */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4">
          <Link
            href="/purchases/create"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-sm font-semibold transition-all shadow-md shadow-primary/5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Another
          </Link>

          <Link
            href="/supplier-invoices"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-semibold transition-all cursor-pointer"
          >
            <Receipt className="h-4 w-4" />
            Settlements
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-sm font-semibold transition-all cursor-pointer"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
