"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { createLedgerSessionAction } from "../controllers/ledgerActions";

function getDefaultTitle(dateFilter) {
  let defaultTitle = "";
  const now = new Date();
  
  if (dateFilter.preset === "specific_month" && dateFilter.month) {
    // YYYY-MM
    const [year, month] = dateFilter.month.split("-");
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
    defaultTitle = `Reconciliation - ${format(dateObj, "MMMM yyyy")}`;
  } else if (dateFilter.preset === "this_month") {
    defaultTitle = `Reconciliation - ${format(now, "MMMM yyyy")}`;
  } else if (dateFilter.startDate && dateFilter.endDate) {
    defaultTitle = `Reconciliation (${format(new Date(dateFilter.startDate), "dd MMM yy")} - ${format(new Date(dateFilter.endDate), "dd MMM yy")})`;
  } else {
    defaultTitle = `Reconciliation Session - ${format(now, "dd MMM yyyy")}`;
  }
  return defaultTitle;
}

export default function LedgerSessionForm({ summary, dateFilter, onCancel, onSuccess }) {
  const [prevDateFilter, setPrevDateFilter] = useState(dateFilter);
  const [title, setTitle] = useState(() => getDefaultTitle(dateFilter));
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive state from prop change during render
  if (dateFilter !== prevDateFilter) {
    setPrevDateFilter(dateFilter);
    setTitle(getDefaultTitle(dateFilter));
  }

  const { supplier, buyer, difference } = summary;

  const formatRs = (val) => {
    return `Rs. ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a session title");
      return;
    }

    // Resolve date range based on filter state
    let startDate = dateFilter.startDate;
    let endDate = dateFilter.endDate;

    if (dateFilter.preset === "specific_month" && dateFilter.month) {
      const [year, month] = dateFilter.month.split("-");
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1).toISOString();
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999).toISOString();
    } else if (dateFilter.preset === "this_month") {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
    } else if (dateFilter.preset === "today") {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      startDate = d.toISOString();
      d.setHours(23, 59, 59, 999);
      endDate = d.toISOString();
    } else if (dateFilter.preset === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      startDate = d.toISOString();
      d.setHours(23, 59, 59, 999);
      endDate = d.toISOString();
    } else if (dateFilter.preset === "this_week") {
      const now = new Date();
      const first = now.getDate() - now.getDay(); // Sunday
      startDate = new Date(now.setDate(first)).toISOString();
      endDate = new Date(now.setDate(first + 6)).toISOString();
    }

    if (!startDate || !endDate) {
      toast.error("Invalid date range selection. Please select a specific date range first.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createLedgerSessionAction({
        title,
        startDate,
        endDate,
        notes,
        status
      });

      if (result.success) {
        toast.success("Reconciliation snapshot saved successfully!");
        onSuccess(result.data);
      } else {
        toast.error(result.error || "Failed to save session");
      }
    } catch (err) {
      toast.error("An unexpected error occurred while saving the session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-md p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between border-b pb-3 mb-4">
        <div>
          <h2 className="text-lg font-bold">Save Reconciliation Snapshot</h2>
          <p className="text-xs text-muted-foreground">Persist current totals as a monthly historical record.</p>
        </div>
        <button 
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Session Title
          </label>
          <input
            type="text"
            className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. May 2026 Reconciliation"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Snapshot Summary Display */}
        <div className="rounded-lg bg-muted/40 border p-3.5 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block">Supplier Base Total:</span>
            <span className="font-bold text-sm text-foreground">{formatRs(supplier.baseTotal)}</span>
            <span className="block text-[10px] text-muted-foreground">({supplier.activeCount} invoices)</span>
          </div>
          <div>
            <span className="text-muted-foreground block">Buyer Base Total:</span>
            <span className="font-bold text-sm text-foreground">{formatRs(buyer.baseTotal)}</span>
            <span className="block text-[10px] text-muted-foreground">({buyer.activeCount} invoices)</span>
          </div>
          <div className="col-span-2 border-t pt-2 flex justify-between items-center font-bold">
            <span>Difference:</span>
            <span className={summary.matched ? "text-emerald-600" : "text-rose-600"}>
              {formatRs(difference)} ({summary.matched ? "MATCHED" : "MISMATCH"})
            </span>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
            Reconciliation Notes / Remarks
          </label>
          <textarea
            className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary h-20 resize-none"
            placeholder="Document any mismatch details or audit decisions here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Lock Status
            </label>
            <select
              className="w-full bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="OPEN">OPEN (Can be deleted/updated)</option>
              <option value="LOCKED">LOCKED (UI operations blocked)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Snapshot
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
