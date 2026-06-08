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
  Banknote
} from "lucide-react";
import { 
  DailyActivityChart, 
  ProductMovementChart, 
  FinancialFlowChart, 
  ReconciliationTrendChart 
} from "./DashboardCharts";

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
    { title: "New Intake", desc: "Record supplier goods intake", href: "/intake/create", icon: Plus, color: "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900" },
    { title: "New Sale", desc: "Create a customer invoice", href: "/sales/create", icon: FileText, color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40 border-violet-100 dark:border-violet-900" },
    { title: "New Settlement", desc: "Settle supplier balances", href: "/supplier-invoices/create", icon: DollarSign, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900" },
    { title: "New Product", desc: "Register an inventory item", href: "/products/create", icon: Package, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900" },
    { title: "Quick Payment", desc: "Sequential collection or payout", href: "/parties", icon: Wallet, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900" },
    { title: "New Advance", desc: "Issue supplier cash advance", href: "/advances/create", icon: Banknote, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {actions.map((act, i) => {
        const IconComponent = act.icon;
        return (
          <Link
            key={i}
            href={act.href}
            className={`border rounded-xl p-3 flex flex-col justify-between space-y-2 hover:scale-[1.02] active:scale-[0.98] transition-all hover:bg-slate-100 dark:hover:bg-slate-900/30 group shadow-sm ${act.color}`}
          >
            <div className="flex items-center justify-between">
              <IconComponent className="h-5 w-5 transition-transform group-hover:rotate-12" />
              <ArrowUpRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h5 className="text-xs font-bold">{act.title}</h5>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium line-clamp-1">{act.desc}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// --- 2. SUMMARY CARDS WIDGET ---
export function SummaryCardsWidget({ data }) {
  const { finance, inventory, ledger, activity } = data;

  const cards = [
    {
      title: "Today's Workload",
      subtitle: "Daily event count",
      icon: Activity,
      color: "border-sky-100 dark:border-sky-900 bg-sky-50/30 dark:bg-sky-950/10",
      iconColor: "text-sky-600 dark:text-sky-400",
      content: (
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-white dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-900">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Intakes</span>
            <div className="text-sm font-extrabold text-sky-600 dark:text-sky-400">{activity.todayIntakesCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-900">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Sales</span>
            <div className="text-sm font-extrabold text-violet-600 dark:text-violet-400">{activity.todaySalesCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-900">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Settled</span>
            <div className="text-sm font-extrabold text-amber-600 dark:text-amber-400">{activity.todaySettlementsCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-900/40 p-2 rounded-lg border border-slate-100 dark:border-slate-900">
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Invoices</span>
            <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{activity.todayBuyerInvoicesCount}</div>
          </div>
        </div>
      )
    },
    {
      title: "Financial Position",
      subtitle: "Active ledger totals",
      icon: DollarSign,
      color: "border-amber-100 dark:border-amber-950 bg-amber-50/30 dark:bg-amber-950/10",
      iconColor: "text-amber-600 dark:text-amber-400",
      content: (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-900 pb-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Supplier Payables:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">Rs. {finance.supplierPayableTotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-900 pb-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Buyer Receivables:</span>
            <span className="font-bold text-teal-600 dark:text-teal-400 font-mono">Rs. {finance.buyerReceivableTotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Today's Commission:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">Rs. {finance.todayCommissionTotal.toLocaleString()}</span>
          </div>
        </div>
      )
    },
    {
      title: "Inventory Memory",
      subtitle: "Current stock totals",
      icon: Package,
      color: "border-emerald-100 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      content: (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Total Stock:</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{inventory.totalStockQuantity.toLocaleString()} KG</span>
          </div>
          <div className="bg-white dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Low Stock Products:</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
              inventory.lowStockCount > 0 
                ? "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-900" 
                : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900"
            }`}>
              {inventory.lowStockCount} Products
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
        ? "border-emerald-100 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/10" 
        : "border-rose-100 dark:border-rose-950 bg-rose-50/30 dark:bg-rose-950/10",
      iconColor: ledger.matched ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      content: (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-900 pb-1.5">
            <span className="text-slate-600 dark:text-slate-400 font-semibold">Last Session:</span>
            <span className="font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]" title={ledger.title}>{ledger.title}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-900 pb-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Diff Amount:</span>
            <span className={`font-bold font-mono ${ledger.difference === 0 ? "text-emerald-600 dark:text-emerald-400" : ledger.matched ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"}`}>
              Rs. {ledger.difference.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold">Audit State:</span>
            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
              ledger.matched 
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60" 
                : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60"
            }`}>
              {ledger.matched ? "Balanced" : "Mismatch"}
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
          <div key={i} className={`border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between ${c.color}`}>
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/40 pb-2">
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{c.title}</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">{c.subtitle}</p>
              </div>
              <Icon className={`h-5 w-5 ${c.iconColor}`} />
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
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-4 border-slate-200 dark:border-slate-900">
      <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
          Recent Activity Feed
        </h4>
        <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono">
          Logs Stream
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
        {feed.length > 0 ? (
          feed.map((item, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900/10 px-2 rounded-lg transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`h-2 w-2 rounded-full shrink-0 ${
                  item.type === "INTAKE" ? "bg-sky-500" :
                  item.type === "SALE" ? "bg-violet-500" :
                  item.type === "SETTLEMENT" ? "bg-amber-500" :
                  item.type === "ADVANCE" ? "bg-emerald-500" : "bg-indigo-500"
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
  const { pendingIntakes, pendingSettlements, pendingBilling, driftAlerts } = data.pending;

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-5 h-full border-slate-200 dark:border-slate-900">
      <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
          Pending Attention
        </h4>
        <span className="text-[9px] font-extrabold uppercase bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded">
          Requires Action
        </span>
      </div>

      <div className="space-y-4">
        {/* Ledger Drift Warnings */}
        {driftAlerts.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Drift Alerts (Sessions)</h5>
            {driftAlerts.map(alert => (
              <div key={alert.id} className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/40 p-2.5 rounded-lg flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-rose-700 dark:text-rose-300 truncate max-w-[150px]">{alert.title}</div>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-mono">Live Drift: Rs. {alert.driftAmount.toLocaleString()}</div>
                </div>
                <Link href="/ledger" className="text-[10px] font-bold text-rose-600 dark:text-rose-300 hover:underline shrink-0">
                  Audit
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Intakes still PENDING */}
        <div className="space-y-2">
          <h5 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Pending Intakes ({pendingIntakes.length})</h5>
          {pendingIntakes.length > 0 ? (
            pendingIntakes.map(intake => (
              <div key={intake.id} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 p-2.5 rounded-lg flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-800 transition-all">
                <div>
                  <div className="font-bold text-slate-700 dark:text-slate-200">{intake.intakeNumber}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[145px]">{intake.partyName} ({intake.productName})</div>
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

        {/* SOLD Intakes Not Settled */}
        <div className="space-y-2">
          <h5 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Unsettled Intakes ({pendingSettlements.length})</h5>
          {pendingSettlements.length > 0 ? (
            pendingSettlements.map(item => (
              <div key={item.id} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 p-2.5 rounded-lg flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-800 transition-all">
                <div>
                  <div className="font-bold text-slate-700 dark:text-slate-200">{item.intakeNumber} (SOLD)</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[145px]">{item.partyName} ({item.productName})</div>
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

        {/* Pending Buyer Billing */}
        <div className="space-y-2">
          <h5 className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Unbilled Buyer Tracks ({pendingBilling.length})</h5>
          {pendingBilling.length > 0 ? (
            pendingBilling.map(track => (
              <div key={track.id} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-900 p-2.5 rounded-lg flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-slate-800 transition-all">
                <div className="min-w-0 mr-2">
                  <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{track.productName} ({track.quantity} KG)</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{track.buyerName}</div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Daily Activity (intakes vs sales) */}
        <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-900">
          <DailyActivityChart data={dailyActivity} />
        </div>

        {/* Financial Flow (settlements vs sales) */}
        <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-900">
          <FinancialFlowChart data={dailyActivity} />
        </div>

        {/* Product Movement (top moving) */}
        <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-900">
          <ProductMovementChart data={productMovement} />
        </div>

        {/* Ledger Trends (matching sessions) */}
        <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-200 dark:border-slate-900">
          <ReconciliationTrendChart data={reconciliationTrend} />
        </div>
      </div>
    </div>
  );
}
