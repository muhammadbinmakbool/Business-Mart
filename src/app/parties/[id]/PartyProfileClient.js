"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, MapPin, TrendingUp, TrendingDown, Wallet, Receipt, Package, Banknote, Scale, ChevronDown, ChevronUp, Clock, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { applyPartyPaymentAction } from "@/modules/parties/controllers/partyActions";

const fmt = (v) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function SummaryCard({ label, value, icon: Icon, color = "primary", sub }) {
  const colors = {
    primary: "bg-primary/5 border-primary/10 text-primary",
    emerald: "bg-emerald-500/5 border-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/5 border-amber-500/10 text-amber-700",
    rose: "bg-rose-500/5 border-rose-500/10 text-rose-700",
    blue: "bg-blue-500/5 border-blue-500/10 text-blue-700",
    violet: "bg-violet-500/5 border-violet-500/10 text-violet-700",
  };
  return (
    <div className={cn("rounded-xl border p-5 space-y-2", colors[color])}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</span>
        {Icon && <Icon className="h-4 w-4 opacity-40" />}
      </div>
      <div className="text-2xl font-black tracking-tight">Rs. {fmt(value)}</div>
      {sub && <div className="text-[10px] font-medium opacity-60">{sub}</div>}
    </div>
  );
}

function TabButton({ active, label, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
      )}
    >
      {label} {count !== undefined && <span className="ml-1 opacity-60">({count})</span>}
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    PENDING: "bg-slate-100 text-slate-700 border-slate-200",
    PARTIAL: "bg-amber-100 text-amber-700 border-amber-200",
    CLEARED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border whitespace-nowrap", map[status] || "bg-muted text-muted-foreground border-muted")}>
      {status}
    </span>
  );
}

function TimelineTable({ events }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? events : events.slice(0, 15);

  if (events.length === 0) {
    return <div className="py-12 text-center text-muted-foreground text-sm italic">No transactions recorded yet.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b">
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Reference</th>
              <th className="px-4 py-3 text-right">Debit (DR)</th>
              <th className="px-4 py-3 text-right">Credit (CR)</th>
              <th className="px-4 py-3 text-right">Running Balance</th>
              <th className="px-4 py-3 text-right">Paid Amount</th>
              <th className="px-4 py-3 text-right">Remaining</th>
              <th className="px-4 py-3 text-center">Clearing Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((evt) => {
              const isSale = evt.type === "SALE";
              const isSup = evt.type === "SUPPLIER_INVOICE";
              const isObligation = isSale || isSup;
              return (
                <tr key={evt.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(evt.date), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase border",
                      isSale ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                      isSup ? "bg-rose-100 text-rose-700 border-rose-200" :
                      "bg-blue-100 text-blue-700 border-blue-200"
                    )}>
                      {evt.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{evt.ref}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {evt.debit > 0 ? <span className="text-emerald-600 font-semibold">{fmt(evt.debit)}</span> : <span className="opacity-30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {evt.credit > 0 ? <span className="text-rose-600 font-semibold">{fmt(evt.credit)}</span> : <span className="opacity-30">—</span>}
                  </td>
                  <td className={cn("px-4 py-3 text-right font-mono text-xs font-bold", evt.runningBalance >= 0 ? "text-emerald-700" : "text-rose-700")}>
                    {fmt(Math.abs(evt.runningBalance))} {evt.runningBalance >= 0 ? "DR" : "CR"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {isObligation ? <span className="text-emerald-600">Rs. {fmt(evt.allocatedAmount)}</span> : <span className="opacity-30">—</span>}
                  </td>
                  <td className={cn("px-4 py-3 text-right font-mono text-xs font-semibold", evt.remainingAmount > 0 ? "text-rose-600" : "text-slate-400 opacity-40")}>
                    {isObligation ? `Rs. ${fmt(evt.remainingAmount)}` : <span className="opacity-30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isObligation ? <StatusBadge status={evt.clearingStatus} /> : <span className="opacity-30">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {events.length > 15 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline mx-auto">
          {expanded ? <><ChevronUp className="h-3 w-3" /> Show Less</> : <><ChevronDown className="h-3 w-3" /> Show All ({events.length})</>}
        </button>
      )}
    </div>
  );
}

function DataTable({ columns, data, emptyMsg = "No records found." }) {
  if (!data || data.length === 0) {
    return <div className="py-12 text-center text-muted-foreground text-sm italic">{emptyMsg}</div>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b">
            {columns.map(c => <th key={c.key} className={cn("px-4 py-3", c.align === "right" ? "text-right" : "text-left")}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((row, i) => (
            <tr key={row.id || i} className="hover:bg-muted/10 transition-colors">
              {columns.map(c => (
                <td key={c.key} className={cn("px-4 py-3", c.align === "right" && "text-right", c.mono && "font-mono text-xs")}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function QuickPaymentForm({ party }) {
  const [paymentType, setPaymentType] = useState(
    party.partyType === "SUPPLIER" ? "CASH_OUT" : "CASH_IN"
  );
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const res = await applyPartyPaymentAction(party.id, amt, paymentType);
      if (res.success) {
        setAmount("");
        setNotes("");
        const count = res.data.allocations.length;
        if (count > 0) {
          const detail = res.data.allocations.map(a => `• Invoice #${a.invoiceNumber} cleared Rs. ${fmt(a.allocated)} (New status: ${a.paymentStatus})`).join("\n");
          alert(`Success! Sequentially cleared ${count} oldest invoice(s):\n\n${detail}\n\nUnallocated excess amount: Rs. ${fmt(res.data.unallocatedAmount)}`);
        } else {
          alert(`Success! Payment of Rs. ${fmt(amt)} applied. No active unpaid invoices found. Unallocated amount: Rs. ${fmt(res.data.unallocatedAmount)}`);
        }
        window.location.reload();
      } else {
        setError(res.error || "Failed to apply payment");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 font-semibold text-center">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block font-black">Payment Direction</label>
        {party.partyType === "BOTH" ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentType("CASH_IN")}
              className={cn(
                "py-2 text-xs font-bold rounded-xl border transition-all",
                paymentType === "CASH_IN" 
                  ? "bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-600/10" 
                  : "bg-muted text-muted-foreground hover:bg-slate-200"
              )}
            >
              CASH IN (Collection)
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("CASH_OUT")}
              className={cn(
                "py-2 text-xs font-bold rounded-xl border transition-all",
                paymentType === "CASH_OUT" 
                  ? "bg-amber-600 border-amber-700 text-white shadow-md shadow-amber-600/10" 
                  : "bg-muted text-muted-foreground hover:bg-slate-200"
              )}
            >
              CASH OUT (Payout)
            </button>
          </div>
        ) : (
          <div className="py-2.5 px-3 rounded-xl bg-muted border border-slate-200 font-bold text-xs">
            {paymentType === "CASH_IN" ? "CASH IN (Receivable Collection from Buyer)" : "CASH OUT (Settlement Payout to Supplier)"}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block font-black">Amount to Clear (Rs.)</label>
        <input
          type="number"
          step="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full bg-slate-50 border rounded-xl py-2 px-3 text-sm font-semibold tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block font-black">Notes / Description (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Cleared pending sales, custom discount applied..."
          rows={3}
          className="w-full bg-slate-50 border rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider py-3 rounded-xl border border-primary/20 hover:bg-primary/95 transition-all disabled:opacity-50 shadow-lg shadow-primary/10"
      >
        {submitting ? "Clearing Oldest Invoices (FIFO)..." : "Apply Quick Payment"}
      </button>

      <div className="text-[9px] text-muted-foreground bg-slate-50 border border-slate-200/50 p-2.5 rounded-lg text-center font-medium leading-relaxed">
        ℹ️ **Sequential Clearing Enabled:** Applying a payment here automatically allocates funds to this party's oldest pending invoices first using direct invoice updates. Fully paid items transition to **CLEARED**, while partially cleared ones update to **PARTIAL**.
      </div>
    </form>
  );
}


export default function PartyProfileClient({ profile }) {

  const { party, summary, timeline, detailedViews } = profile;
  const [activeTab, setActiveTab] = useState("overview");

  const salesCols = [
    { key: "saleNumber", label: "Invoice #" },
    { key: "entryDate", label: "Date", render: r => format(new Date(r.entryDate), "dd MMM yyyy") },
    { key: "totalWeight", label: "Weight", align: "right", mono: true, render: r => `${fmt(r.totalWeight)} KG` },
    { key: "finalAmount", label: "Amount", align: "right", mono: true, render: r => `Rs. ${fmt(r.finalAmount)}` },
    { key: "allocatedAmount", label: "Paid Amount", align: "right", mono: true, render: r => `Rs. ${fmt(r.allocatedAmount)}` },
    { key: "remainingAmount", label: "Remaining", align: "right", mono: true, render: r => `Rs. ${fmt(r.remainingAmount)}` },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
  ];

  const settlementCols = [
    { key: "invoiceNumber", label: "Invoice #" },
    { key: "entryDate", label: "Date", render: r => format(new Date(r.entryDate), "dd MMM yyyy") },
    { key: "totalGrossValue", label: "Gross", align: "right", mono: true, render: r => `Rs. ${fmt(r.totalGrossValue)}` },
    { key: "totalDeductions", label: "Deductions", align: "right", mono: true, render: r => `Rs. ${fmt(r.totalDeductions)}` },
    { key: "finalPayableAmount", label: "Payable", align: "right", mono: true, render: r => `Rs. ${fmt(r.finalPayableAmount)}` },
    { key: "allocatedAmount", label: "Paid Amount", align: "right", mono: true, render: r => `Rs. ${fmt(r.allocatedAmount)}` },
    { key: "remainingAmount", label: "Remaining", align: "right", mono: true, render: r => `Rs. ${fmt(r.remainingAmount)}` },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
  ];

  const advanceCols = [
    { key: "id", label: "ID", render: r => `ADV-${r.id}` },
    { key: "createdAt", label: "Date", render: r => format(new Date(r.createdAt), "dd MMM yyyy, hh:mm a") },
    { key: "amount", label: "Amount", align: "right", mono: true, render: r => `Rs. ${fmt(r.amount)}` },
    { key: "notes", label: "Notes", render: r => r.notes || "—" },
  ];

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "payments", label: "Quick FIFO Clearing" },
    { key: "sales", label: "Sales Invoices", count: detailedViews.sales.length },
    { key: "settlements", label: "Supplier Settlements", count: detailedViews.settlements.length },
    { key: "advances", label: "Cash Advances", count: detailedViews.advances.length },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/parties" className="mt-1.5 rounded-full p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{party.name}</h1>
              <span className={cn(
                "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border",
                party.partyType === "SUPPLIER" ? "bg-blue-600 text-white border-blue-700" :
                party.partyType === "BUYER" ? "bg-emerald-600 text-white border-emerald-700" :
                "bg-violet-600 text-white border-violet-700"
              )}>{party.partyType}</span>
              {!party.isActive && <span className="text-[10px] font-bold text-destructive uppercase">Inactive</span>}
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              {party.phoneNumber && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {party.phoneNumber}</span>}
              {party.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {party.address}</span>}
            </div>
          </div>
        </div>

        {/* Net Outstanding Balance */}
        <div className={cn(
          "rounded-2xl px-6 py-4 text-center shadow-lg transition-all",
          summary.officialBalance >= 0 ? "bg-emerald-600 text-white shadow-emerald-600/20" : "bg-rose-600 text-white shadow-rose-600/20"
        )}>
          <div className="text-[10px] uppercase font-bold opacity-70 tracking-widest">Net Outstanding Balance</div>
          <div className="text-2xl font-black mt-1">Rs. {fmt(Math.abs(summary.officialBalance))}</div>
          <div className="text-xs font-bold mt-0.5 opacity-80">
            {summary.officialBalance >= 0 ? "DEBIT (Party owes us)" : "CREDIT (We owe Supplier)"}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Buyer Sales" value={summary.totalSales} icon={Receipt} color="emerald" sub="Sales registered" />
        <SummaryCard label="Remaining Sales Debt" value={summary.totalSalesRemaining} icon={TrendingUp} color="amber" sub="Unpaid Buyer Balances" />
        <SummaryCard label="Supplier Settlements" value={summary.totalSupplierPayable} icon={Package} color="rose" sub="Billed Settlements" />
        <SummaryCard label="Remaining Payables" value={summary.totalSupplierRemaining} icon={TrendingDown} color="blue" sub="Unpaid Supplier Balances" />
      </div>

      {/* Overview stats reconciliation block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
          <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest font-black">Buyer Account Standing</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Sales Billing</span><span className="font-bold text-slate-800">Rs. {fmt(summary.totalSales)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid by Buyer</span><span className="font-bold text-emerald-600">Rs. {fmt(summary.totalSalesPaid)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Cash Advances Issued</span><span className="font-bold text-amber-600">Rs. {fmt(summary.totalAdvances)}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Outstanding Debt</span>
              <span className="text-amber-600 font-mono">Rs. {fmt(summary.totalSalesRemaining + summary.totalAdvances)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm border-dashed">
          <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest font-black">Supplier Account Standing</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Supplier Invoices</span><span className="font-bold text-slate-800">Rs. {fmt(summary.totalSupplierPayable)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid to Supplier</span><span className="font-bold text-emerald-600">Rs. {fmt(summary.totalSupplierPaid)}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Outstanding Payable</span>
              <span className="text-rose-600 font-mono">Rs. {fmt(summary.totalSupplierRemaining)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 border-b">
        {tabs.map(t => <TabButton key={t.key} active={activeTab === t.key} label={t.label} count={t.count} onClick={() => setActiveTab(t.key)} />)}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-muted/30 border-b flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Chronological Invoice Log</h3>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border font-semibold">Realized Transactions</span>
              </div>
              <div className="p-0">
                <TimelineTable events={timeline} />
              </div>
            </div>
          </div>
        )}
        {activeTab === "payments" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="rounded-2xl border p-6 space-y-4 bg-muted/10 border-dashed">
                <div className="flex items-center gap-3">
                  <Scale className="h-6 w-6 text-primary" />
                  <h3 className="font-bold text-base">Direct Chronological Clearance (FIFO)</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Grain market transactions are cleared sequentially. Invoices are sorted by **Entry Date ASC** and payments are automatically forward-filled. 
                </p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-white border rounded-xl p-4 text-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">Active Sales Pending</span>
                    <span className="text-lg font-black text-amber-600 mt-1 block">Rs. {fmt(summary.totalSalesRemaining)}</span>
                  </div>
                  <div className="bg-white border rounded-xl p-4 text-center">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground block">Active Settlements Pending</span>
                    <span className="text-lg font-black text-rose-600 mt-1 block">Rs. {fmt(summary.totalSupplierRemaining)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="sticky top-6 bg-card border border-primary/10 rounded-2xl p-6 shadow-md space-y-4 bg-white/80 backdrop-blur-md">
                <div className="flex items-center gap-2 border-b pb-3">
                  <Banknote className="h-5 w-5 text-primary animate-pulse" />
                  <div>
                    <h3 className="font-bold text-sm">Quick Payment Entry</h3>
                    <p className="text-[10px] text-muted-foreground">Auto-clears oldest outstanding bills</p>
                  </div>
                </div>
                <QuickPaymentForm party={party} />
              </div>
            </div>
          </div>
        )}


        {activeTab === "sales" && <DataTable columns={salesCols} data={detailedViews.sales} emptyMsg="No sales invoices found for this party." />}
        {activeTab === "settlements" && <DataTable columns={settlementCols} data={detailedViews.settlements} emptyMsg="No supplier settlement invoices found." />}
        {activeTab === "advances" && <DataTable columns={advanceCols} data={detailedViews.advances} emptyMsg="No advances recorded for this party." />}
      </div>
    </div>
  );
}
