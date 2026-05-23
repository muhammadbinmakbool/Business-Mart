"use client";

import React, { useMemo } from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Activity, Percent, Layers, ShieldCheck, ShieldAlert } from "lucide-react";

// --- 1. DAILY ACTIVITY CHART (CSS BARS) ---
export function DailyActivityChart({ data = [] }) {
  const maxVal = useMemo(() => {
    const counts = data.map(d => Math.max(d.intakeCount, d.saleCount));
    return Math.max(...counts, 5); // default min 5
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400" />
          Daily Intakes vs Sales Count
        </h4>
        <div className="flex items-center gap-3 text-[10px] font-bold">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 bg-sky-500 rounded-sm" />
            <span className="text-slate-400 dark:text-slate-500">Intakes</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 bg-violet-500 rounded-sm" />
            <span className="text-slate-400 dark:text-slate-500">Sales</span>
          </div>
        </div>
      </div>

      <div className="h-[160px] bg-white dark:bg-slate-950/40 rounded-xl p-3 border border-slate-200 dark:border-slate-900 flex items-end justify-between gap-2 shadow-inner">
        {data.length > 0 ? (
          data.map((day, idx) => {
            const intakeHeight = (day.intakeCount / maxVal) * 100;
            const saleHeight = (day.saleCount / maxVal) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full group relative">
                {/* Tooltip (remains dark for high contrast popover look) */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[9px] font-mono text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg">
                  <div className="font-bold border-b border-slate-800 pb-0.5 mb-0.5">{day.date}</div>
                  <div className="text-sky-450">Intakes: {day.intakeCount}</div>
                  <div className="text-violet-455">Sales: {day.saleCount}</div>
                </div>

                {/* Bars */}
                <div className="flex-1 w-full flex items-end justify-center gap-0.5">
                  <div 
                    style={{ height: `${intakeHeight}%` }} 
                    className="w-1.5 bg-sky-500/80 hover:bg-sky-500 rounded-t transition-all"
                  />
                  <div 
                    style={{ height: `${saleHeight}%` }} 
                    className="w-1.5 bg-violet-500/80 hover:bg-violet-500 rounded-t transition-all"
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-1 select-none">
                  {day.label}
                </span>
              </div>
            );
          })
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            No activity records in range.
          </div>
        )}
      </div>
    </div>
  );
}

// --- 2. PRODUCT MOVEMENT CHART (HORIZONTAL PROGRESS BARS) ---
export function ProductMovementChart({ data = [] }) {
  const maxWeight = useMemo(() => {
    const weights = data.map(d => d.weight);
    return Math.max(...weights, 100);
  }, [data]);

  return (
    <div className="space-y-3.5">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
        <Layers className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
        Top Moving Products (Weight)
      </h4>

      <div className="space-y-3">
        {data.length > 0 ? (
          data.map((item, idx) => {
            const pct = (item.weight / maxWeight) * 100;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono">{item.weight.toLocaleString()} KG</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/40 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${pct}%` }}
                    className="h-full bg-emerald-500/80 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-slate-500 text-center py-6">
            No sales recordings available.
          </div>
        )}
      </div>
    </div>
  );
}

// --- 3. FINANCIAL FLOW CHART (DUAL COLUMN VALUE SUMMARY) ---
export function FinancialFlowChart({ data = [] }) {
  const maxVal = useMemo(() => {
    const vals = data.map(d => Math.max(d.settlementValue, d.saleValue));
    return Math.max(...vals, 1000);
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-505 dark:text-slate-400 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          Financial Settlement vs Sale Values
        </h4>
        <div className="flex items-center gap-3 text-[10px] font-bold">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 bg-amber-500 rounded-sm" />
            <span className="text-slate-400 dark:text-slate-500">Settlements</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 bg-teal-500 rounded-sm" />
            <span className="text-slate-400 dark:text-slate-500">Sales</span>
          </div>
        </div>
      </div>

      <div className="h-[160px] bg-white dark:bg-slate-950/40 rounded-xl p-3 border border-slate-200 dark:border-slate-900 flex items-end justify-between gap-2 shadow-inner">
        {data.length > 0 ? (
          data.map((day, idx) => {
            const settHeight = (day.settlementValue / maxVal) * 100;
            const saleHeight = (day.saleValue / maxVal) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[9px] font-mono text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg">
                  <div className="font-bold border-b border-slate-800 pb-0.5 mb-0.5">{day.date}</div>
                  <div className="text-amber-550 font-semibold">Settlements: Rs. {day.settlementValue.toLocaleString()}</div>
                  <div className="text-teal-450 font-semibold">Sales: Rs. {day.saleValue.toLocaleString()}</div>
                </div>

                {/* Bars */}
                <div className="flex-1 w-full flex items-end justify-center gap-0.5">
                  <div 
                    style={{ height: `${settHeight}%` }} 
                    className="w-1.5 bg-amber-500/80 hover:bg-amber-500 rounded-t transition-all"
                  />
                  <div 
                    style={{ height: `${saleHeight}%` }} 
                    className="w-1.5 bg-teal-500/80 hover:bg-teal-555 rounded-t transition-all"
                  />
                </div>
                <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 mt-1 select-none">
                  {day.label}
                </span>
              </div>
            );
          })
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
            No financial events in range.
          </div>
        )}
      </div>
    </div>
  );
}

// --- 4. RECONCILIATION TREND LOGS ---
export function ReconciliationTrendChart({ data = [] }) {
  return (
    <div className="space-y-3.5">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-505 dark:text-slate-400 flex items-center gap-1.5">
        <Percent className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
        Ledger Reconciliation Trend
      </h4>

      <div className="grid grid-cols-5 gap-2">
        {data.length > 0 ? (
          data.map((s, idx) => (
            <div 
              key={idx} 
              className={`p-2.5 rounded-lg border flex flex-col justify-between items-center text-center space-y-1.5 transition-all shadow-sm ${
                s.matched 
                  ? "bg-emerald-50 border-emerald-100 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:border-emerald-950/60 dark:hover:bg-emerald-950/30" 
                  : "bg-rose-50 border-rose-100 hover:bg-rose-100/50 dark:bg-rose-950/20 dark:border-rose-950/60 dark:hover:bg-rose-950/30"
              }`}
              title={`${s.title} (Diff: Rs. ${s.difference})`}
            >
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[60px] block font-mono">
                {s.title.split(" ").slice(-1)[0]}
              </span>
              
              {s.matched ? (
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ShieldAlert className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400" />
              )}

              <span className={`text-[8.5px] font-bold font-mono px-1 py-0.5 rounded ${
                s.matched 
                  ? "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/60" 
                  : "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-950/60"
              }`}>
                {s.matched ? "Match" : "Drift"}
              </span>
            </div>
          ))
        ) : (
          <div className="col-span-5 text-xs text-slate-500 text-center py-6">
            No saved ledger sessions.
          </div>
        )}
      </div>
    </div>
  );
}
