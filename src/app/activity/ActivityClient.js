"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  Tag, 
  User, 
  Database,
  ArrowRight,
  Loader2
} from "lucide-react";
import { fetchActivityLogsAction } from "./activityActions";

const ENTITY_TYPES = ["PRODUCT", "PARTY", "INTAKE", "SALE", "SETTLEMENT", "SYSTEM"];
const ACTIONS = ["CREATED", "UPDATED", "DELETED", "COMPLETED", "CANCELLED", "ARCHIVED", "SUPERSEDED", "SOLD"];

export default function ActivityClient() {
  // Filter States
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [entityId, setEntityId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Data States
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // UI Interactive States
  const [expandedRow, setExpandedRow] = useState(null);

  // Fetch handler
  const loadLogs = async () => {
    setIsLoading(true);
    setExpandedRow(null);
    const parsedId = entityId ? parseInt(entityId) : undefined;
    
    const result = await fetchActivityLogsAction({
      entityType,
      action,
      entityId: isNaN(parsedId) ? undefined : parsedId,
      startDate,
      endDate,
      page,
      limit
    });

    if (result.success) {
      setLogs(result.logs);
      setTotal(result.total);
      setTotalPages(result.totalPages || 1);
    } else {
      console.error("Failed to load logs:", result.error);
    }
    setIsLoading(false);
  };

  // Trigger load on state change
  useEffect(() => {
    loadLogs();
  }, [entityType, action, page, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const clearFilters = () => {
    setEntityType("");
    setAction("");
    setEntityId("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // Color mappings
  const getEntityBadgeClass = (type) => {
    const maps = {
      PRODUCT: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
      PARTY: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
      INTAKE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
      SALE: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
      SETTLEMENT: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
      SYSTEM: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
    };
    return maps[type] || "bg-muted text-muted-foreground border border-muted-foreground/10";
  };

  const getActionBadgeClass = (act) => {
    const maps = {
      CREATED: "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20",
      UPDATED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
      DELETED: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
      COMPLETED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
      CANCELLED: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border border-slate-500/25",
      ARCHIVED: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20",
      SUPERSEDED: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-400 border border-fuchsia-500/20",
      SOLD: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
    };
    return maps[act] || "bg-muted text-muted-foreground border border-muted-foreground/10";
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="bg-card text-card-foreground border rounded-xl p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Entity ID Search */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by Entity ID (e.g. 42)..."
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-sm rounded-lg border bg-background border-input focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
            />
          </div>

          {/* Entity Type Filter */}
          <div>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 w-full text-sm rounded-lg border bg-background border-input focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
            >
              <option value="">All Entity Types</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 w-full text-sm rounded-lg border bg-background border-input focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
            >
              <option value="">All Actions</option>
              {ACTIONS.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters & Run Search */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
            >
              Search ID
            </button>
            <button
              type="button"
              onClick={clearFilters}
              title="Reset Filters"
              className="flex items-center justify-center p-2 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Date Ranges and Telemetry Summary */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Date Range:</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 text-xs rounded border bg-background border-input focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted-foreground text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 text-xs rounded border bg-background border-input focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="text-xs text-muted-foreground font-medium">
            Showing <span className="text-foreground">{logs.length}</span> of{" "}
            <span className="text-foreground">{total}</span> total audit entries
          </div>
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-card text-card-foreground border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Database className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-base font-semibold text-foreground">No logs found</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Try adjusting your search criteria or date filters to find matching logs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Entity Type</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Entity ID</th>
                  <th className="px-6 py-4">Operator</th>
                  <th className="px-6 py-4 text-right">Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {logs.map((log) => {
                  const isExpanded = expandedRow === log.id;
                  const formattedDate = new Date(log.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false
                  });

                  return (
                    <React.Fragment key={log.id}>
                      {/* Row Item */}
                      <tr 
                        className={`hover:bg-accent/40 transition-colors cursor-pointer ${
                          isExpanded ? "bg-accent/20" : ""
                        }`}
                        onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                      >
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${getEntityBadgeClass(log.entityType)}`}>
                            {log.entityType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${getActionBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-foreground max-w-sm truncate" title={log.description}>
                          {log.description || "—"}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-muted-foreground">
                          {log.entityId !== null ? `#${log.entityId}` : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-foreground">{log.userName || "system"}</span>
                            <span className="text-xs text-muted-foreground font-mono">({log.userId})</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRow(isExpanded ? null : log.id);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded hover:bg-primary/5 cursor-pointer"
                          >
                            <span>Inspect</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Inspector */}
                      {isExpanded && (
                        <tr className="bg-muted/30">
                          <td colSpan={7} className="px-8 py-5 border-t border-b">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                                <div className="flex items-center gap-2">
                                  <Tag className="h-3.5 w-3.5" />
                                  <span>Activity Event Metadata Snapshot</span>
                                </div>
                                <span className="font-mono text-slate-400">ID: {log.id}</span>
                              </div>
                              
                              <pre className="p-4 rounded-xl bg-slate-950 dark:bg-slate-900 border border-slate-800 text-xs font-mono text-slate-100 overflow-x-auto max-w-full shadow-inner select-all leading-relaxed">
                                <code>
                                  {log.meta 
                                    ? JSON.stringify(log.meta, null, 2) 
                                    : JSON.stringify({ message: "No metadata captured for this event." }, null, 2)
                                  }
                                </code>
                              </pre>
                              
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Operation Path:</span>
                                <span className="font-mono bg-accent px-1.5 py-0.5 rounded text-foreground">
                                  {log.entityType.toLowerCase()}/{log.action.toLowerCase()}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                                <span className="italic">Metadata is immutable and read-only for system diagnostics.</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {logs.length > 0 && (
          <div className="bg-muted/20 border-t px-6 py-4 flex items-center justify-between gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="text-sm font-medium px-4 py-2 border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-card cursor-pointer"
            >
              Previous
            </button>
            <div className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of{" "}
              <span className="font-medium text-foreground">{totalPages}</span>
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="text-sm font-medium px-4 py-2 border rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-card cursor-pointer"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
