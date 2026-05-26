"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, MapPin, TrendingUp, TrendingDown, Wallet, Receipt, Package, Banknote, Scale, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    BILLED: "bg-blue-100 text-blue-700 border-blue-200",
    CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border", map[status] || "bg-muted text-muted-foreground border-muted")}>
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
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.map((evt) => (
              <tr key={evt.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(evt.date), "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-bold uppercase",
                    evt.type === "SALE" ? "bg-emerald-100 text-emerald-700" :
                    evt.type === "INTAKE" ? "bg-blue-100 text-blue-700" :
                    evt.type === "CASH_OUT" ? "bg-amber-100 text-amber-700" :
                    "bg-muted text-muted-foreground"
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
                <td className="px-4 py-3 text-center"><StatusBadge status={evt.status} /></td>
              </tr>
            ))}
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

export default function PartyProfileClient({ profile }) {
  const { party, summary, timeline, detailedViews } = profile;
  const [activeTab, setActiveTab] = useState("overview");

  const allIntakes = useMemo(() => [
    ...detailedViews.intakes.billed.map(i => ({ ...i, creditType: "REALIZED" })),
    ...detailedViews.intakes.unbilled.map(i => ({ ...i, creditType: "PENDING" }))
  ], [detailedViews.intakes]);

  const salesCols = [
    { key: "saleNumber", label: "Invoice #" },
    { key: "entryDate", label: "Date", render: r => format(new Date(r.entryDate), "dd MMM yyyy") },
    { key: "totalWeight", label: "Weight", align: "right", mono: true, render: r => `${fmt(r.totalWeight)} KG` },
    { key: "finalAmount", label: "Amount", align: "right", mono: true, render: r => `Rs. ${fmt(r.finalAmount)}` },
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
  ];

  const intakeCols = [
    { key: "intakeNumber", label: "Intake #" },
    { key: "entryDate", label: "Date", render: r => format(new Date(r.entryDate), "dd MMM yyyy") },
    { key: "product", label: "Product" },
    { key: "weight", label: "Weight", align: "right", mono: true, render: r => `${fmt(r.weight)} KG` },
    { key: "value", label: "Value", align: "right", mono: true, render: r => `Rs. ${fmt(r.finalValue || r.estimatedValue)}` },
    { key: "creditType", label: "Credit Type", render: r => (
      <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase", r.creditType === "REALIZED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
        {r.creditType}
      </span>
    )},
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} /> },
  ];

  const settlementCols = [
    { key: "invoiceNumber", label: "Invoice #" },
    { key: "entryDate", label: "Date", render: r => format(new Date(r.entryDate), "dd MMM yyyy") },
    { key: "totalGrossValue", label: "Gross", align: "right", mono: true, render: r => `Rs. ${fmt(r.totalGrossValue)}` },
    { key: "totalDeductions", label: "Deductions", align: "right", mono: true, render: r => `Rs. ${fmt(r.totalDeductions)}` },
    { key: "finalPayableAmount", label: "Payable", align: "right", mono: true, render: r => `Rs. ${fmt(r.finalPayableAmount)}` },
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
    { key: "sales", label: "Sales", count: detailedViews.sales.length },
    { key: "intakes", label: "Intakes", count: allIntakes.length },
    { key: "settlements", label: "Settlements", count: detailedViews.settlements.length },
    { key: "advances", label: "Advances", count: detailedViews.advances.length },
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
        {/* Net Balance Badge */}
        <div className={cn(
          "rounded-2xl px-6 py-4 text-center shadow-lg",
          summary.officialBalance >= 0 ? "bg-emerald-600 text-white shadow-emerald-600/20" : "bg-rose-600 text-white shadow-rose-600/20"
        )}>
          <div className="text-[10px] uppercase font-bold opacity-70 tracking-widest">Official Balance</div>
          <div className="text-2xl font-black mt-1">Rs. {fmt(Math.abs(summary.officialBalance))}</div>
          <div className="text-xs font-bold mt-0.5 opacity-80">{summary.officialBalance >= 0 ? "DEBIT (DR)" : "CREDIT (CR)"}</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard label="Total Sales" value={summary.totalSales} icon={Receipt} color="emerald" sub="Debit (DR)" />
        <SummaryCard label="Cash Advances" value={summary.totalAdvances} icon={Banknote} color="amber" sub="Debit (DR)" />
        <SummaryCard label="Paid Settlements" value={summary.totalPaidInvoices} icon={Wallet} color="blue" sub="Cash Out (DR)" />
        <SummaryCard label="Realized Credit" value={summary.realizedCredit} icon={Package} color="rose" sub="Billed Intakes (CR)" />
        <SummaryCard label="Pending Credit" value={summary.pendingCredit} icon={Clock} color="violet" sub="Unbilled (CR) — Forecast Only" />
        <SummaryCard label="Total Debits" value={summary.totalDebits} icon={TrendingUp} color="primary" sub="All DR combined" />
      </div>

      {/* Check & Balance Reconciliation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
          <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Official Reconciliation (Realized Only)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Debit</span><span className="font-bold text-emerald-700">Rs. {fmt(summary.totalDebits)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Realized Credit</span><span className="font-bold text-rose-700">Rs. {fmt(summary.realizedCredit)}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Difference</span>
              <span className={summary.officialBalance === 0 ? "text-emerald-600" : "text-amber-600"}>
                Rs. {fmt(Math.abs(summary.officialBalance))} {summary.officialBalance >= 0 ? "DR" : "CR"}
              </span>
            </div>
          </div>
          <div className={cn("text-center text-xs font-bold py-1.5 rounded-lg", summary.officialBalance === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
            {summary.officialBalance === 0 ? "✓ BALANCED" : "⚠ UNBALANCED"}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm border-dashed">
          <h3 className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Forecast Balance (Incl. Pending — UI Only)</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Debit</span><span className="font-bold text-emerald-700">Rs. {fmt(summary.totalDebits)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Credit (Realized + Pending)</span><span className="font-bold text-rose-700">Rs. {fmt(summary.totalCredits)}</span></div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Estimated Difference</span>
              <span className={summary.forecastBalance === 0 ? "text-emerald-600" : "text-amber-600"}>
                Rs. {fmt(Math.abs(summary.forecastBalance))} {summary.forecastBalance >= 0 ? "DR" : "CR"}
              </span>
            </div>
          </div>
          <div className="text-center text-[10px] font-medium text-muted-foreground py-1.5 rounded-lg bg-muted/50">
            ⓘ Forecast only — not accounting-grade
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(t => <TabButton key={t.key} active={activeTab === t.key} label={t.label} count={t.count} onClick={() => setActiveTab(t.key)} />)}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-muted/30 border-b">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Unified Transaction Timeline</h3>
              </div>
              <div className="p-0">
                <TimelineTable events={timeline} />
              </div>
            </div>

            {/* Future Placeholder */}
            <div className="rounded-xl border border-dashed bg-muted/10 p-8 text-center space-y-2">
              <Scale className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <div className="text-sm font-semibold text-muted-foreground/50">Credit Limits • Risk Scoring • Payment Delay Analytics</div>
              <div className="text-[10px] text-muted-foreground/40">Coming soon — reserved placeholder</div>
            </div>
          </div>
        )}

        {activeTab === "sales" && <DataTable columns={salesCols} data={detailedViews.sales} emptyMsg="No sales recorded for this party." />}
        {activeTab === "intakes" && <DataTable columns={intakeCols} data={allIntakes} emptyMsg="No intakes recorded for this party." />}
        {activeTab === "settlements" && <DataTable columns={settlementCols} data={detailedViews.settlements} emptyMsg="No settlements generated for this party." />}
        {activeTab === "advances" && <DataTable columns={advanceCols} data={detailedViews.advances} emptyMsg="No advances recorded for this party." />}
      </div>
    </div>
  );
}
