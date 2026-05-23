"use client";

import React, { useState, useMemo, transition } from "react";
import { useRouter } from "next/navigation";
import { 
  TrendingUp, 
  Plus, 
  Info, 
  Calendar, 
  Filter, 
  Archive, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  User, 
  Search,
  BookOpen,
  Eye,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { createRateAction, archiveRateAction } from "@/modules/market-insight/controllers/marketInsightActions";

export default function MarketInsightDashboardClient({
  products,
  activeRates,
  archivedRates,
  allRates,
  analyticsData,
  currentPeriod,
  currentProductId,
  currentAuditFilter
}) {
  const router = useRouter();
  
  // State variables
  const [activeTab, setActiveTab] = useState("charts"); // charts or audit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductRateId, setSelectedProductRateId] = useState(products[0]?.id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // UI defaults derived from selected product
  const selectedProductObj = useMemo(() => {
    return products.find(p => p.id === parseInt(selectedProductRateId));
  }, [products, selectedProductRateId]);

  const defaultUnit = selectedProductObj?.primaryUnit || "KG";

  // Filter handlers
  function handlePeriodChange(period) {
    const params = new URLSearchParams(window.location.search);
    params.set("period", period);
    router.push(`?${params.toString()}`);
  }

  function handleProductFilterChange(prodId) {
    const params = new URLSearchParams(window.location.search);
    if (prodId === "ALL") {
      params.delete("productId");
    } else {
      params.set("productId", prodId);
    }
    router.push(`?${params.toString()}`);
  }

  function handleAuditFilterChange(filter) {
    const params = new URLSearchParams(window.location.search);
    params.set("auditFilter", filter);
    router.push(`?${params.toString()}`);
  }

  // Soft Delete Action handler
  async function handleArchive(id) {
    if (!confirm("Are you sure you want to archive this rate log?")) return;
    
    const res = await archiveRateAction(id);
    if (res?.success) {
      toast.success("Rate log archived successfully");
    } else {
      toast.error(res?.error || "Failed to archive rate log");
    }
  }

  // Rate record form handler
  async function handleFormSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData(e.currentTarget);
    const res = await createRateAction(formData);
    
    setIsSubmitting(false);
    if (res?.success) {
      toast.success("Rate log recorded successfully");
      setIsModalOpen(false);
    } else {
      toast.error(res?.error || "Failed to record rate");
    }
  }

  // Price line chart setup
  const chartProduct = useMemo(() => {
    return products.find(p => p.id === parseInt(currentProductId)) || products[0];
  }, [products, currentProductId]);

  const pricePoints = useMemo(() => {
    if (!chartProduct) return [];
    
    let lastValidRate = null;
    return analyticsData.map(d => {
      const dayRate = d.rates[chartProduct.name];
      if (dayRate !== undefined) {
        lastValidRate = dayRate;
      }
      return {
        date: d.date,
        label: d.label,
        rate: dayRate !== undefined ? dayRate : lastValidRate // carry forward
      };
    });
  }, [analyticsData, chartProduct]);

  // SVG Chart Dimensions & Math
  const lineChartData = useMemo(() => {
    const validPoints = pricePoints.filter(p => p.rate !== null && p.rate > 0);
    if (validPoints.length === 0) return null;
    
    const rates = validPoints.map(p => p.rate);
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    const margin = (maxRate - minRate) * 0.1 || 50; // padding top/bottom
    
    const yMax = maxRate + margin;
    const yMin = Math.max(0, minRate - margin);
    
    return {
      points: pricePoints,
      yMax,
      yMin,
      hasData: true
    };
  }, [pricePoints]);

  const svgLinePath = useMemo(() => {
    if (!lineChartData) return "";
    const width = 800;
    const height = 220;
    const paddingX = 40;
    const paddingY = 20;
    
    const { points, yMax, yMin } = lineChartData;
    const stepX = (width - paddingX * 2) / (points.length - 1);
    
    const coordinates = points.map((p, idx) => {
      const x = paddingX + idx * stepX;
      // If rate is null/0, map to bottom or skip. We carry forward so it should have a value
      const rateVal = p.rate || yMin;
      const y = height - paddingY - ((rateVal - yMin) / (yMax - yMin)) * (height - paddingY * 2);
      return { x, y, ...p };
    });

    const linePath = coordinates.reduce((acc, p, idx) => {
      return acc + `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    }, "");

    // Area path closed to bottom
    const areaPath = linePath + 
      ` L ${coordinates[coordinates.length - 1].x.toFixed(1)} ${(height - paddingY).toFixed(1)}` +
      ` L ${coordinates[0].x.toFixed(1)} ${(height - paddingY).toFixed(1)} Z`;

    return {
      line: linePath,
      area: areaPath,
      coords: coordinates
    };
  }, [lineChartData]);

  // Activity counts helpers
  const activityMax = useMemo(() => {
    const intakes = analyticsData.map(d => d.intakesCount);
    const sales = analyticsData.map(d => d.salesCount);
    return Math.max(...intakes, ...sales, 5); // default min 5 for height scaling
  }, [analyticsData]);

  // Active list audit filtering (client-side search)
  const displayedRatesList = useMemo(() => {
    const baseList = currentAuditFilter === "ARCHIVED" 
      ? archivedRates 
      : currentAuditFilter === "ALL" 
        ? allRates 
        : activeRates;

    if (!searchQuery) return baseList;
    
    const query = searchQuery.toLowerCase();
    return baseList.filter(r => {
      return (
        r.product?.name?.toLowerCase().includes(query) ||
        r.source?.toLowerCase().includes(query) ||
        r.notes?.toLowerCase().includes(query) ||
        r.unit?.toLowerCase().includes(query)
      );
    });
  }, [activeRates, archivedRates, allRates, currentAuditFilter, searchQuery]);

  return (
    <div className="space-y-6 pb-12">
      {/* Disclaimer Banner */}
      <div className="rounded-xl border bg-slate-900/60 p-4 border-sky-950 flex items-start gap-3.5 shadow-md">
        <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-sky-900/60 text-sky-300 border border-sky-800">
              Reference Market Data Only
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            Market Insight is an observation-only analytics layer containing market rate logs ("market memory"). 
            These rates are independent records and **never** auto-fill invoice transactions, modify inventory stock, or affect ledger balances.
          </p>
        </div>
      </div>

      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Market Insight</h1>
          <p className="text-sm text-slate-400">Track raw pricing fluctuations, event volumes, and product flow metrics.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          Record Daily Rate
        </button>
      </div>

      {/* Tabs and Filters Panel */}
      <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* View Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab("charts")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === "charts" 
                ? "bg-slate-800 text-slate-100 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Market Trend Charts
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === "audit" 
                ? "bg-slate-800 text-slate-100 shadow-sm" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Raw Data Audit
          </button>
        </div>

        {/* Global Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Product:
            </span>
            <select
              value={currentProductId || "ALL"}
              onChange={(e) => handleProductFilterChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary text-slate-200"
            >
              <option value="ALL">All Products (Charts fallback to first)</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Range:
            </span>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
              {["7d", "30d", "90d"].map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  className={`px-2.5 py-1 font-bold rounded-md transition-all uppercase ${
                    currentPeriod === p 
                      ? "bg-slate-800 text-slate-200" 
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "charts" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rate Trend Card */}
          <div className="lg:col-span-2 bg-card border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-800">
              <div className="space-y-0.5">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
                  Rate Trend Line
                </h3>
                <p className="text-xs text-slate-500">
                  Historical rate history for <strong className="text-slate-300">{chartProduct?.name || "Product"}</strong> ({currentPeriod.toUpperCase()})
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800 uppercase">
                Observed Memory
              </span>
            </div>

            {/* SVG Line Chart */}
            {svgLinePath && lineChartData ? (
              <div className="space-y-4">
                <div className="relative h-[240px] w-full bg-slate-950/40 rounded-lg p-2 border border-slate-900 flex items-center justify-center">
                  <svg 
                    viewBox="0 0 800 220" 
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    {/* Gradients */}
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Gridlines */}
                    <line x1="40" y1="20" x2="760" y2="20" stroke="#1e293b" strokeDasharray="3,3" />
                    <line x1="40" y1="70" x2="760" y2="70" stroke="#1e293b" strokeDasharray="3,3" />
                    <line x1="40" y1="120" x2="760" y2="120" stroke="#1e293b" strokeDasharray="3,3" />
                    <line x1="40" y1="170" x2="760" y2="170" stroke="#1e293b" strokeDasharray="3,3" />
                    <line x1="40" y1="200" x2="760" y2="200" stroke="#334155" />

                    {/* Gradient Area Fill */}
                    <path d={svgLinePath.area} fill="url(#chartGrad)" />

                    {/* Line Chart Path */}
                    <path d={svgLinePath.line} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

                    {/* Dots & Labels */}
                    {svgLinePath.coords.map((c, i) => {
                      // Only display dots for days with data to prevent clutter
                      const showLabel = i === 0 || i === svgLinePath.coords.length - 1 || (svgLinePath.coords.length < 15 && i % 3 === 0);
                      
                      return (
                        <g key={i} className="group/dot">
                          {c.rate && (
                            <>
                              <circle 
                                cx={c.x} 
                                cy={c.y} 
                                r="4" 
                                className="fill-emerald-500 stroke-slate-950 stroke-2 hover:r-6 hover:fill-emerald-400 transition-all cursor-pointer" 
                              />
                              <title>{`${c.label}: Rs. ${c.rate}`}</title>
                            </>
                          )}
                          {showLabel && (
                            <text 
                              x={c.x} 
                              y="215" 
                              textAnchor="middle" 
                              className="fill-slate-500 text-[9px] font-mono"
                            >
                              {c.label}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Y-Axis Value Indicators */}
                    <text x="35" y="24" textAnchor="end" className="fill-slate-500 text-[8px] font-mono">{Math.round(lineChartData.yMax)}</text>
                    <text x="35" y="110" textAnchor="end" className="fill-slate-500 text-[8px] font-mono">{Math.round((lineChartData.yMax + lineChartData.yMin) / 2)}</text>
                    <text x="35" y="196" textAnchor="end" className="fill-slate-500 text-[8px] font-mono">{Math.round(lineChartData.yMin)}</text>
                  </svg>
                </div>
                
                {/* Statistics summaries */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900 space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Highest Observed</span>
                    <div className="font-extrabold text-sm text-emerald-400">
                      Rs. {Math.round(lineChartData.yMax)}
                    </div>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900 space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Lowest Observed</span>
                    <div className="font-extrabold text-sm text-rose-400">
                      Rs. {Math.round(lineChartData.yMin)}
                    </div>
                  </div>
                  <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-900 space-y-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Total Logs (Period)</span>
                    <div className="font-extrabold text-sm text-slate-300">
                      {pricePoints.filter(p => p.rate !== null).length} Entries
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center border border-dashed rounded-lg bg-slate-950/20 text-slate-500 space-y-2">
                <AlertTriangle className="h-6 w-6 text-amber-500/70" />
                <p className="text-xs">No price logs found for this product in the selected period.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  Create first log entry
                </button>
              </div>
            )}
          </div>

          {/* Activity Event Counting Card */}
          <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b pb-3 border-slate-800">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-sky-400" />
                  Activity Counts
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">Counts Only</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Observational count of operational transactions. Derived from source data.
              </p>
            </div>

            {/* Event Count Bars Chart */}
            <div className="h-[180px] w-full flex items-end justify-between gap-1 bg-slate-950/30 rounded-lg p-3 border border-slate-900">
              {analyticsData.map((d, i) => {
                const intakeHeight = (d.intakesCount / activityMax) * 100;
                const saleHeight = (d.salesCount / activityMax) * 100;
                
                // Show X labels on first/mid/last index
                const showX = i === 0 || i === analyticsData.length - 1 || (analyticsData.length < 15 && i % 3 === 0);

                return (
                  <div key={i} className="flex-1 flex flex-col items-center h-full group relative">
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[9px] font-mono text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg">
                      <div className="font-bold border-b border-slate-800 pb-0.5 mb-0.5">{d.label}</div>
                      <div className="text-sky-400">Intakes: {d.intakesCount}</div>
                      <div className="text-violet-400">Sales: {d.salesCount}</div>
                    </div>

                    <div className="flex-1 w-full flex items-end justify-center gap-0.5 relative">
                      <div 
                        style={{ height: `${intakeHeight}%` }} 
                        className="w-1.5 bg-sky-500/80 hover:bg-sky-400 rounded-t transition-all"
                      />
                      <div 
                        style={{ height: `${saleHeight}%` }} 
                        className="w-1.5 bg-violet-500/80 hover:bg-violet-400 rounded-t transition-all"
                      />
                    </div>
                    {showX && (
                      <span className="text-[8px] text-slate-600 font-mono mt-1 select-none">
                        {d.label.split(" ")[1]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Color indicators */}
            <div className="flex items-center justify-around text-xs bg-slate-950/20 py-2.5 rounded-lg border border-slate-900/60 font-semibold">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-sky-500 rounded" />
                <span className="text-slate-400">Intake Count</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-violet-500 rounded" />
                <span className="text-slate-400">Sale Count</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Raw Data Audit Table view */
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden space-y-4 p-6">
          {/* Header & filters inside table */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search raw entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-slate-200"
              />
            </div>

            {/* Archive State Filters */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 self-start">
              {["ACTIVE", "ARCHIVED", "ALL"].map(filter => (
                <button
                  key={filter}
                  onClick={() => handleAuditFilterChange(filter)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    currentAuditFilter === filter 
                      ? "bg-slate-800 text-slate-200 shadow-sm" 
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {filter.charAt(0) + filter.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Actual Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Rate (Rs.)</th>
                  <th className="py-3 px-4">Unit</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayedRatesList.length > 0 ? (
                  displayedRatesList.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-800/20 transition-colors ${
                        item.isDeleted ? "opacity-60 text-slate-500 bg-slate-950/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-slate-200">
                        {item.product?.name || `Product ${item.productId}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(item.date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-400 font-mono">
                        Rs. {item.rate}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-medium">{item.unit}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-400">
                          {item.source || "MANUAL"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {item.createdBy || "System"}
                      </td>
                      <td className="py-3 px-4 max-w-[180px] truncate text-slate-400" title={item.notes}>
                        {item.notes || "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {item.isDeleted ? (
                          <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-900 border border-slate-800/40 px-2.5 py-0.5 rounded-full">
                            Archived
                          </span>
                        ) : (
                          <button
                            onClick={() => handleArchive(item.id)}
                            className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded transition-all inline-flex items-center gap-1 font-bold text-[11px]"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-8 text-center text-slate-500 font-medium">
                      No rates records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Rate Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-card border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100">Record Daily Market Rate</h3>
                <p className="text-xs text-slate-400">Log an observed pricing point for tracking trends.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-400 text-sm font-semibold hover:bg-slate-800/40 px-2.5 py-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Product */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Select Product</label>
                <select
                  name="productId"
                  required
                  value={selectedProductRateId}
                  onChange={(e) => setSelectedProductRateId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-slate-200"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Rate & Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Rate (Rs.)</label>
                  <input
                    type="number"
                    name="rate"
                    step="0.01"
                    required
                    placeholder="e.g. 4200"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Rate Unit</label>
                  <select
                    name="unit"
                    value={defaultUnit}
                    onChange={() => {}} // Controlled by state default, editable via state if user customizes
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-slate-200"
                  >
                    <option value="KG">Kilogram (KG)</option>
                    <option value="MAUND">Maund (40 KG)</option>
                    <option value="BAG">Bag (Conversion unit)</option>
                    <option value="LITER">Liter (LITER)</option>
                    <option value="PIECE">Piece (PIECE)</option>
                  </select>
                </div>
              </div>

              {/* Date & Source */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Observation Date</label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Source Registry</label>
                  <select
                    name="source"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-slate-200"
                  >
                    <option value="MANUAL">Manual operator</option>
                    <option value="MARKET"> Ghalla Mandi board</option>
                    <option value="WHATSAPP">WhatsApp group</option>
                    <option value="NEWS">Radio / Newspaper</option>
                    <option value="SUPPLIER">Supplier quote</option>
                    <option value="INTERNAL">Internal reference</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Notes (Optional)</label>
                <textarea
                  name="notes"
                  placeholder="Record specific seasonal context, quality factors..."
                  className="w-full h-20 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-slate-200 resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-850 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                >
                  {isSubmitting ? "Saving..." : "Record Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
