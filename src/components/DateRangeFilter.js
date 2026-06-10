"use client";

import React from "react";
import { Calendar, ArrowRight } from "lucide-react";
import { getDefaultFilterState, filterByDateRange } from "@/lib/dateFilters";

export { getDefaultFilterState, filterByDateRange };


export default function DateRangeFilter({ value, onChange }) {
  const handlePresetChange = (e) => {
    const newPreset = e.target.value;
    onChange({
      ...value,
      preset: newPreset,
      // Reset inputs when switching presets to avoid stale filter bounds
      startDate: newPreset === "custom" ? value.startDate : "",
      endDate: newPreset === "custom" ? value.endDate : "",
      month: newPreset === "specific_month" ? value.month || new Date().toISOString().slice(0, 7) : ""
    });
  };

  const handleInputChange = (field, val) => {
    onChange({
      ...value,
      [field]: val
    });
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Preset Dropdown */}
      <div className="relative flex items-center">
        <Calendar className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <select
          value={value.preset}
          onChange={handlePresetChange}
          className="w-full sm:w-44 bg-card border rounded-xl pl-9 pr-8 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer appearance-none"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="this_week">This Week</option>
          <option value="this_month">This Month</option>
          <option value="specific_month">Specific Month</option>
          <option value="custom">Custom Range</option>
        </select>
        <div className="absolute right-3 pointer-events-none flex items-center">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Specific Month Input */}
      {value.preset === "specific_month" && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
          <input
            type="month"
            value={value.month}
            onChange={(e) => handleInputChange("month", e.target.value)}
            className="bg-card border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
          />
        </div>
      )}

      {/* Custom Date Inputs */}
      {value.preset === "custom" && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
          <input
            type="date"
            value={value.startDate}
            onChange={(e) => handleInputChange("startDate", e.target.value)}
            className="bg-card border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            placeholder="Start Date"
          />
          <div className="hidden sm:flex items-center text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
          </div>
          <input
            type="date"
            value={value.endDate}
            onChange={(e) => handleInputChange("endDate", e.target.value)}
            className="bg-card border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
            placeholder="End Date"
          />
        </div>
      )}
    </div>
  );
}
