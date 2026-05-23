"use client";

import React from "react";
import { WIDGET_REGISTRY } from "@/modules/dashboard/components/widgetRegistry";
import { DashboardErrorBoundary } from "@/modules/dashboard/components/DashboardErrorBoundary";

export default function DashboardClient({ data }) {
  return (
    <div className="space-y-6 pb-12">
      {/* Control Room Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-900 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Control Room</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time operational overview. Read-only observer layer.</p>
        </div>
        
        {/* Connection status indicator */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 self-start text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Observation Active
        </div>
      </div>

      {/* Grid Container rendering modular registry items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {WIDGET_REGISTRY.filter(w => w.enabled).map(widget => {
          const WidgetComponent = widget.component;
          return (
            <div key={widget.id} className={widget.gridClass}>
              <DashboardErrorBoundary name={widget.name}>
                <WidgetComponent data={data} />
              </DashboardErrorBoundary>
            </div>
          );
        })}
      </div>
    </div>
  );
}
