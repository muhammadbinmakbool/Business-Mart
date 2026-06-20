"use client";

import React from "react";
import Link from "next/link";
import { 
  Plus, 
  FileText, 
  BookOpen, 
  TrendingUp, 
  ArrowUpRight, 
  Activity, 
  AlertTriangle, 
  User, 
  Clock, 
  DollarSign, 
  Package, 
  ShieldCheck, 
  ShieldAlert,
  Wallet,
  Banknote,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { 
  DailyActivityChart, 
  ProductMovementChart, 
  FinancialFlowChart, 
  ReconciliationTrendChart 
} from "./DashboardCharts";
import { useSettings } from "@/components/layout/SettingsContext";
import { formatCurrency } from "@/lib/formatters/financialFormatter";

// --- HYDRATION-SAFE LOCAL TIME COMPONENT ---
function ClientTime({ dateStr }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono select-none">
        --:--
      </div>
    );
  }

  const localTime = new Date(dateStr).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
      {localTime}
    </div>
  );
}

// --- 1. QUICK SHORTCUT ACTIONS WIDGET ---
export function QuickActionsWidget() {
  const actions = [
    { title: "New Intake", desc: "Record supplier goods intake", href: "/intake/create?backUrl=/dashboard", icon: Plus, color: "text-sky-600 dark:text-sky-400 bg-sky-50/65 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/40" },
    { title: "New Sale", desc: "Create a customer invoice", href: "/sales/create?backUrl=/dashboard", icon: FileText, color: "text-violet-600 dark:text-violet-400 bg-violet-50/65 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/40" },
    { title: "New Settlement", desc: "Settle supplier balances", href: "/supplier-invoices/create?backUrl=/dashboard", icon: DollarSign, color: "text-amber-600 dark:text-amber-400 bg-amber-50/65 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/40" },
    { title: "New Product", desc: "Register an inventory item", href: "/products/create?backUrl=/dashboard", icon: Package, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50/65 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40" },
    { title: "Quick Payment", desc: "Sequential collection or payout", href: "/parties", icon: Wallet, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50/65 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40" },
    { title: "New Advance", desc: "Issue supplier cash advance", href: "/advances/create?backUrl=/dashboard", icon: Banknote, color: "text-rose-600 dark:text-rose-400 bg-rose-50/65 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {actions.map((act, i) => {
        const IconComponent = act.icon;
        return (
          <Link
            key={i}
            href={act.href}
            className={`border rounded-xl p-2.5 flex flex-col justify-between space-y-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all hover:bg-slate-100 dark:hover:bg-slate-900/20 group shadow-sm ${act.color}`}
          >
            <div className="flex items-center justify-between">
              <IconComponent className="h-4.5 w-4.5 transition-transform group-hover:rotate-12" />
              <ArrowUpRight className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h5 className="text-[11px] font-bold">{act.title}</h5>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium line-clamp-1">{act.desc}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// --- 2. SUMMARY CARDS WIDGET ---
export function SummaryCardsWidget({ data }) {
  const { decimalPlaces, currencySymbol } = useSettings();
  const { finance, inventory, ledger, activity } = data;

  const renderDiff = (today, yesterday) => {
    const diff = today - yesterday;
    if (diff > 0) return <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">▲ +{diff}</span>;
    if (diff < 0) return <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">▼ {diff}</span>;
    return <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">±0</span>;
  };

  const renderDelta = (val, isNegativeGood = false) => {
    if (val > 0) {
      const color = isNegativeGood ? "text-rose-600 dark:text-rose-455" : "text-emerald-600 dark:text-emerald-400";
      return <span className={`text-[9.5px] font-extrabold ${color}`}>▲ +{formatCurrency(val, "en", currencySymbol, decimalPlaces)} today</span>;
    }
    if (val < 0) {
      const color = isNegativeGood ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-455";
      return <span className={`text-[9.5px] font-extrabold ${color}`}>▼ -{formatCurrency(Math.abs(val), "en", currencySymbol, decimalPlaces)} today</span>;
    }
    return <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">±0 today</span>;
  };

  const formatReconciliationDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  };

  const cards = [
    {
      title: "Today's Workload",
      subtitle: "Daily event count",
      icon: Activity,
      color: "border-sky-100 dark:border-sky-900/60 bg-sky-50/20 dark:bg-sky-950/5",
      iconColor: "text-sky-600 dark:text-sky-400",
      content: (
        <div className="grid grid-cols-2 gap-1.5 text-left">
          <div className="bg-white dark:bg-slate-900/40 p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-900/50">
            <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none">Intakes</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <div className="text-sm font-extrabold text-sky-655 dark:text-sky-400">{activity.todayIntakesCount}</div>
              <div className="text-[9px] scale-[0.9] origin-bottom-right">{renderDiff(activity.todayIntakesCount, activity.yesterdayIntakesCount)}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-900/50">
            <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none">Sales</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <div className="text-sm font-extrabold text-violet-655 dark:text-violet-400">{activity.todaySalesCount}</div>
              <div className="text-[9px] scale-[0.9] origin-bottom-right">{renderDiff(activity.todaySalesCount, activity.yesterdaySalesCount)}</div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-900/50">
            <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none">Settled</span>
            <div className="text-sm font-extrabold text-amber-655 dark:text-amber-400 mt-0.5">{activity.todaySettlementsCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-900/50">
            <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none">Buyer Bills</span>
            <div className="text-sm font-extrabold text-emerald-655 dark:text-emerald-400 mt-0.5">{activity.todayBuyerInvoicesCount}</div>
          </div>
        </div>
      )
    },
    {
      title: "Financial Position",
      subtitle: "Active ledger totals",
      icon: DollarSign,
      color: "border-amber-100 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/5",
      iconColor: "text-amber-600 dark:text-amber-400",
      content: (
        <div className="space-y-1.5">
          <div className="bg-white dark:bg-slate-900/40 p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-900/50 flex flex-col">
            <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">
              <span>Supplier Payables</span>
              <span className="font-mono text-[11px] font-extrabold text-amber-655 dark:text-amber-455">{formatCurrency(finance.supplierPayableTotal, "en", currencySymbol, decimalPlaces)}</span>
            </div>
            <div className="text-right mt-0.5 leading-none">
              {renderDelta(finance.supplierPayableTodayChange, true)}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-900/50 flex flex-col">
            <div className="flex justify-between items-center text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase">
              <span>Buyer Receivables</span>
              <span className="font-mono text-[11px] font-extrabold text-teal-655 dark:text-teal-455">{formatCurrency(finance.buyerReceivableTotal, "en", currencySymbol, decimalPlaces)}</span>
            </div>
            <div className="text-right mt-0.5 leading-none">
              {renderDelta(finance.buyerReceivableTodayChange, false)}
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] px-1 pt-0.5">
            <span className="text-slate-550 dark:text-slate-400 font-semibold">Today's Commission:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-455 font-mono">{formatCurrency(finance.todayCommissionTotal, "en", currencySymbol, decimalPlaces)}</span>
          </div>
        </div>
      )
    },
    {
      title: "Inventory Memory",
      subtitle: "Current stock totals",
      icon: Package,
      color: "border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/5",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      content: (
        <div className="space-y-1.5">
          <div className="bg-white dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-900/50">
            <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none">Current Inventory</span>
            <div className="text-base font-extrabold text-emerald-655 dark:text-emerald-400 font-mono mt-0.5">{inventory.totalStockQuantity.toLocaleString()} KG</div>
            <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 font-bold">Top Category: <span className="text-slate-700 dark:text-slate-300 font-mono">{inventory.topCategory}</span></div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-900/50 flex items-center justify-between">
            <span className="text-[9px] text-slate-550 dark:text-slate-400 font-bold uppercase leading-none">Low Stock Products</span>
            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border leading-none ${
              inventory.lowStockCount > 0 
                ? "bg-rose-50/60 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30" 
                : "bg-emerald-50/60 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30"
            }`}>
              {inventory.lowStockCount} Items
            </span>
          </div>
        </div>
      )
    },
    {
      title: "Ledger Reconciliation",
      subtitle: "Latest locked session",
      icon: BookOpen,
      color: ledger.matched 
        ? "border-emerald-100 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/5" 
        : "border-rose-100 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/5",
      iconColor: ledger.matched ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      content: (
        <div className="space-y-1.5">
          <div className="bg-white dark:bg-slate-900/40 p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-900/50 text-[10px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[8.5px]">Last Reconciliation</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">{formatReconciliationDate(ledger.endDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[8.5px]">Status</span>
              <span className={`px-1 py-0.5 text-[8.5px] font-extrabold uppercase rounded border leading-none ${
                ledger.matched 
                  ? "bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30" 
                  : "bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-455 border-rose-100 dark:border-rose-900/30"
              }`}>
                {ledger.matched ? "Balanced ✅" : "Mismatch ❌"}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-900/50 flex items-center justify-between text-[10px]">
            <span className="text-slate-550 dark:text-slate-400 font-bold uppercase text-[8.5px]">Difference</span>
            <span className={`font-bold font-mono text-[11px] ${ledger.difference === 0 ? "text-emerald-600 dark:text-emerald-400" : ledger.matched ? "text-amber-600 dark:text-amber-405" : "text-rose-600 dark:text-rose-455"}`}>
              {formatCurrency(ledger.difference, "en", currencySymbol, decimalPlaces)}
            </span>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className={`border rounded-2xl p-3.5 shadow-sm space-y-2.5 flex flex-col justify-between h-full ${c.color}`}>
            <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800/30 pb-1.5">
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{c.title}</h4>
                <p className="text-[9px] text-slate-400 dark:text-slate-550 font-medium uppercase tracking-wider">{c.subtitle}</p>
              </div>
              <Icon className={`h-4 w-4 ${c.iconColor}`} />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              {c.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- 3. RECENT ACTIVITY FEED WIDGET ---
export function RecentActivityWidget({ data }) {
  const feed = data.activity.feed;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 border-slate-200 dark:border-slate-900 h-full">
      <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-slate-550 dark:text-slate-400" />
          Recent Activity Feed
        </h4>
        <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono">
          Logs Stream
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[360px] overflow-y-auto pr-1">
        {feed.length > 0 ? (
          feed.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900/10 px-2 rounded-lg transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  item.type === "INTAKE" ? "bg-sky-500" :
                  item.type === "SALE" ? "bg-violet-500" :
                  item.type === "SETTLEMENT" ? "bg-amber-500" :
                  item.type === "ADVANCE" ? "bg-rose-500" : "bg-indigo-500"
                }`} />
                <div className="min-w-0">
                  <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{item.title}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                    <User className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-600" />
                    {item.partyName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-right">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{item.value}</span>
                  <ClientTime dateStr={item.createdAt} />
                </div>
                <Link
                  href={item.link}
                  className="text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2.5 py-1 rounded transition-colors"
                >
                  View
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">
            No system transactions recorded today.
          </div>
        )}
      </div>
    </div>
  );
}

// --- 4. PENDING ATTENTION ALERTS WIDGET ---
export function PendingAttentionWidget({ data }) {
  const { decimalPlaces, currencySymbol } = useSettings();
  const { 
    pendingIntakes, 
    pendingSettlements, 
    pendingBilling, 
    pendingIntakesCount,
    pendingSettlementsCount,
    pendingBillingCount,
    intakeOldestAgeDays,
    settlementOldestAgeDays,
    billingOldestAgeDays,
    driftAlerts 
  } = data.pending;

  const [expanded, setExpanded] = React.useState({
    drift: true,
    intakes: true,
    settlements: true,
    billing: true
  });

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatAge = (days) => {
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-5 h-full border-slate-200 dark:border-slate-900 flex flex-col justify-between">
      <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
          Pending Attention
        </h4>
        <span className="text-[9px] font-extrabold uppercase bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded animate-pulse">
          Requires Action
        </span>
      </div>

      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 flex-1">
        {/* Ledger Drift Warnings */}
        {driftAlerts.length > 0 && (
          <div className="space-y-2">
            <button 
              onClick={() => toggleSection("drift")}
              className="w-full text-[10px] uppercase font-extrabold text-rose-500 tracking-wider flex items-center justify-between border-b border-rose-100/50 dark:border-rose-950/40 pb-1 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            >
              <span className="flex items-center gap-1">
                {expanded.drift ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span>Drift Alerts ({driftAlerts.length})</span>
              </span>
            </button>
            {expanded.drift && (
              <div className="space-y-1.5 transition-all">
                {driftAlerts.map(alert => (
                  <div key={alert.id} className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/40 p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-rose-700 dark:text-rose-350 truncate max-w-[150px]">{alert.title}</div>
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">Live Drift: {formatCurrency(alert.driftAmount, "en", currencySymbol, decimalPlaces)}</div>
                    </div>
                    <Link href="/ledger" className="text-[10px] font-bold text-rose-600 dark:text-rose-300 hover:underline shrink-0">
                      Audit
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Intakes still PENDING */}
        <div className="space-y-2">
          <button 
            onClick={() => toggleSection("intakes")}
            className="w-full text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-450 tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-1 hover:text-slate-700 dark:hover:text-slate-250 transition-colors"
          >
            <span className="flex items-center gap-1">
              {expanded.intakes ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>⚠ {pendingIntakesCount} Pending Intakes</span>
            </span>
            <span className="font-semibold font-mono text-[9px] text-slate-400 dark:text-slate-500 lowercase">oldest: {formatAge(intakeOldestAgeDays)}</span>
          </button>
          
          {expanded.intakes && (
            <div className="space-y-1.5 transition-all">
              {pendingIntakes.length > 0 ? (
                pendingIntakes.map(intake => (
                  <div key={intake.id} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 p-2.5 rounded-lg flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-800 transition-all">
                    <div>
                      <div className="font-bold text-slate-700 dark:text-slate-200">{intake.intakeNumber}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[165px]">{intake.partyName} ({intake.productName})</div>
                    </div>
                    <Link href={`/intake/${intake.id}/edit`} className="text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded transition-colors">
                      Sell
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400 dark:text-slate-500 italic px-2">No pending intake logs.</div>
              )}
            </div>
          )}
        </div>

        {/* SOLD Intakes Not Settled */}
        <div className="space-y-2">
          <button 
            onClick={() => toggleSection("settlements")}
            className="w-full text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-455 tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-1 hover:text-slate-700 dark:hover:text-slate-250 transition-colors"
          >
            <span className="flex items-center gap-1">
              {expanded.settlements ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>⚠ {pendingSettlementsCount} Unsettled Settlements</span>
            </span>
            <span className="font-semibold font-mono text-[9px] text-slate-400 dark:text-slate-500 lowercase">oldest: {formatAge(settlementOldestAgeDays)}</span>
          </button>

          {expanded.settlements && (
            <div className="space-y-1.5 transition-all">
              {pendingSettlements.length > 0 ? (
                pendingSettlements.map(item => (
                  <div key={item.id} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 p-2.5 rounded-lg flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-800 transition-all">
                    <div>
                      <div className="font-bold text-slate-700 dark:text-slate-200">{item.intakeNumber} (SOLD)</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[165px]">{item.partyName} ({item.productName})</div>
                    </div>
                    <Link href="/supplier-invoices/create" className="text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded transition-colors">
                      Bill
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400 dark:text-slate-500 italic px-2">All sold items settled.</div>
              )}
            </div>
          )}
        </div>

        {/* Pending Buyer Billing */}
        <div className="space-y-2">
          <button 
            onClick={() => toggleSection("billing")}
            className="w-full text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-455 tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-1 hover:text-slate-700 dark:hover:text-slate-250 transition-colors"
          >
            <span className="flex items-center gap-1">
              {expanded.billing ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span>⚠ {pendingBillingCount} Unbilled Buyer Tracks</span>
            </span>
            <span className="font-semibold font-mono text-[9px] text-slate-400 dark:text-slate-500 lowercase">oldest: {formatAge(billingOldestAgeDays)}</span>
          </button>

          {expanded.billing && (
            <div className="space-y-1.5 transition-all">
              {pendingBilling.length > 0 ? (
                pendingBilling.map(track => (
                  <div key={track.id} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 p-2.5 rounded-lg flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-800 transition-all">
                    <div className="min-w-0 mr-2">
                      <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{track.productName} ({track.quantity} KG)</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-555 truncate">{track.buyerName}</div>
                    </div>
                    <Link href="/sales/create" className="text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded shrink-0 transition-colors">
                      Invoice
                    </Link>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-slate-400 dark:text-slate-500 italic px-2">No unbilled buyer batches.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- 5. CHARTS WRAPPER WIDGET ---
export function ChartsWidget({ data }) {
  const { dailyActivity, productMovement, reconciliationTrend } = data.charts;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-6 border-slate-200 dark:border-slate-900">
      <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400" />
          Business Flow Visualizations
        </h3>
        <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono">
          Last 7 Days
        </span>
      </div>

      <div className="space-y-6">
        {/* Dominant Chart 1: Sales vs Intakes */}
        <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-xl border border-slate-200 dark:border-slate-900">
          <DailyActivityChart data={dailyActivity} />
        </div>

        {/* Dominant Chart 2: Financial Settlements vs Sales */}
        <div className="bg-slate-50/50 dark:bg-slate-950/20 p-5 rounded-xl border border-slate-200 dark:border-slate-900">
          <FinancialFlowChart data={dailyActivity} />
        </div>

        {/* Secondary Charts: Top Products and Reconciliation Trend side-by-side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-900 flex flex-col justify-between">
            <ProductMovementChart data={productMovement} />
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-900 flex flex-col justify-between">
            <ReconciliationTrendChart data={reconciliationTrend} />
          </div>
        </div>
      </div>
    </div>
  );
}
