"use client";

import React from "react";
import { Calendar, ArrowRight } from "lucide-react";

/**
 * Helper to initialize the default date filter state.
 */
export function getDefaultFilterState(defaultPreset = "all") {
  return {
    preset: defaultPreset,
    startDate: "",
    endDate: "",
    month: "" // format "YYYY-MM"
  };
}

/**
 * Shared utility to filter records in memory based on the date range filter state.
 * @param {Array} records - The list of objects to filter.
 * @param {string} dateField - The object field containing the transaction date.
 * @param {Object} filterState - Active state containing preset, startDate, endDate, and month.
 */
export function filterByDateRange(records, dateField, filterState) {
  if (!filterState || filterState.preset === "all") return records;

  const now = new Date();
  let start = null;
  let end = null;

  const getDayBounds = (d) => {
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const e = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    return { s, e };
  };

  switch (filterState.preset) {
    case "today": {
      const bounds = getDayBounds(now);
      start = bounds.s;
      end = bounds.e;
      break;
    }
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const bounds = getDayBounds(yesterday);
      start = bounds.s;
      end = bounds.e;
      break;
    }
    case "this_week": {
      // Start of current week (assuming Monday is start of week)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      const boundsStart = getDayBounds(monday);
      const boundsEnd = getDayBounds(new Date());
      start = boundsStart.s;
      end = boundsEnd.e;
      break;
    }
    case "this_month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    }
    case "specific_month": {
      if (filterState.month) {
        const [year, month] = filterState.month.split("-").map(Number);
        // month is 1-indexed in string, convert to 0-indexed for Date
        start = new Date(year, month - 1, 1, 0, 0, 0, 0);
        end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
      }
      break;
    }
    case "custom": {
      if (filterState.startDate) {
        const [yr, mo, dy] = filterState.startDate.split("-").map(Number);
        start = new Date(yr, mo - 1, dy, 0, 0, 0, 0);
      }
      if (filterState.endDate) {
        const [yr, mo, dy] = filterState.endDate.split("-").map(Number);
        end = new Date(yr, mo - 1, dy, 23, 59, 59, 999);
      }
      break;
    }
    default:
      return records;
  }

  return records.filter((rec) => {
    const dateVal = rec[dateField];
    if (!dateVal) return false;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;

    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

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
