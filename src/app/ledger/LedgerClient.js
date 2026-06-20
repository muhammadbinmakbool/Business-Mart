"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSettings } from "@/components/layout/SettingsContext";
import { formatCurrency } from "@/lib/formatters/financialFormatter";
import { 
  BookOpen, 
  History, 
  Plus, 
  Calendar, 
  Trash2, 
  Lock, 
  Unlock, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle,
  FileText,
  DollarSign,
  Printer,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PrintButtons from "@/print/components/PrintButtons";

import DateRangeFilter, { filterByDateRange } from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import LedgerDashboard from "@/modules/ledger/components/LedgerDashboard";
import ReconciliationTable from "@/modules/ledger/components/ReconciliationTable";
import LedgerSessionForm from "@/modules/ledger/components/LedgerSessionForm";
import DataTable from "@/components/ui/DataTable";
import PaginationControls from "@/components/ui/PaginationControls";

import { DEFAULT_TOLERANCE } from "@/lib/reconciliation";

import DeleteButton from "@/components/DeleteButton";
import { 
  deleteLedgerSessionAction, 
  hardDeleteLedgerSessionAction,
  toggleLockSessionAction, 
  getLedgerSessionDetailsAction,
  listLedgerSessionsAction 
} from "@/modules/ledger/controllers/ledgerActions";

export default function LedgerClient({ 
  initialInvoices = [], 
  initialInvoicesCount = 0,
  initialSales = [], 
  initialSalesCount = 0,
  initialSummary = {},
  suppliers = [], 
  buyers = [], 
  initialSessions = [],
  initialSessionsCount = 0,
  initialPage = 1,
  initialLimit = 50,
  initialInvPage = 1,
  initialSalePage = 1,
  initialLiveLimit = 50,
  initialSearchQuery = "",
  printConfig = null,
  settlementSettings = null,
  currentSortField = "endDate",
  currentSortDirection = "desc"
}) {
  const { decimalPlaces, currencySymbol } = useSettings();
  const tolerance = settlementSettings?.reconciliationTolerance !== undefined ? Number(settlementSettings.reconciliationTolerance) : DEFAULT_TOLERANCE;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("tab") || "LIVE";
  const currentPage = parseInt(searchParams.get("page")) || initialPage || 1;
  const currentLimit = parseInt(searchParams.get("limit")) || initialLimit || 50;

  const invPage = parseInt(searchParams.get("invPage")) || initialInvPage || 1;
  const salePage = parseInt(searchParams.get("salePage")) || initialSalePage || 1;
  const liveLimit = parseInt(searchParams.get("limit")) || initialLiveLimit || 50;

  const setActiveTab = (tab) => {
    updateFilters({ tab, page: 1 });
  };

  const updateFilters = (updates) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || initialSearchQuery || "");
  const [selectedSupplierId, setSelectedSupplierId] = useState(() => searchParams.get("supplierId") || "ALL");
  const [selectedBuyerId, setSelectedBuyerId] = useState(() => searchParams.get("buyerId") || "ALL");
  
  // Default date filter to URL state or "this_month" for monthly balancing operations
  const [dateFilter, setDateFilter] = useState(() => {
    const preset = searchParams.get("preset") || "this_month";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const month = searchParams.get("month") || "";
    return { preset, startDate, endDate, month };
  });
  
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [sessionsCount, setSessionsCount] = useState(initialSessionsCount);
  const [viewingSessionDetails, setViewingSessionDetails] = useState(null);
  const [loadingSessionId, setLoadingSessionId] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Sync parameters from URL changes back to component states
  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
    setSelectedSupplierId(searchParams.get("supplierId") || "ALL");
    setSelectedBuyerId(searchParams.get("buyerId") || "ALL");
    setDateFilter({
      preset: searchParams.get("preset") || "this_month",
      startDate: searchParams.get("startDate") || "",
      endDate: searchParams.get("endDate") || "",
      month: searchParams.get("month") || ""
    });
  }, [searchParams]);

  // Sync props to state on changes
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  useEffect(() => {
    setSessionsCount(initialSessionsCount);
  }, [initialSessionsCount]);

  // Gracefully handle deleting last item on the page
  useEffect(() => {
    if (activeTab === "HISTORY" && currentPage > 1 && sessions.length === 0) {
      updateFilters({ page: Math.max(1, currentPage - 1) });
    }
  }, [sessions, currentPage, activeTab]);
  
  // Format currency helper
  const formatRs = (val) => {
    return formatCurrency(val, "en", currencySymbol, decimalPlaces);
  };

  const selectedSupplierName = useMemo(() => {
    if (selectedSupplierId === "ALL") return "All Suppliers";
    return suppliers.find(s => s.id === parseInt(selectedSupplierId))?.name || `Supplier ID: ${selectedSupplierId}`;
  }, [selectedSupplierId, suppliers]);

  const selectedBuyerName = useMemo(() => {
    if (selectedBuyerId === "ALL") return "All Buyers";
    return buyers.find(b => b.id === parseInt(selectedBuyerId))?.name || `Buyer ID: ${selectedBuyerId}`;
  }, [selectedBuyerId, buyers]);

  // Handle on-demand fetching for large live reports
  const handlePrintLive = async (actionType) => {
    setIsPrinting(true);
    const toastId = toast.loading("Fetching complete dataset for report...");
    try {
      const { getLiveLedgerPrintDataAction } = await import("@/modules/ledger/controllers/ledgerActions");
      const res = await getLiveLedgerPrintDataAction({
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        supplierId: selectedSupplierId,
        buyerId: selectedBuyerId,
        searchQuery
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to fetch print data");
      }

      const fullPrintData = {
        title: "Ledger Reconciliation Report (Live)",
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        supplierName: selectedSupplierName,
        buyerName: selectedBuyerName,
        invoices: res.data.invoices,
        sales: res.data.sales,
        summary: initialSummary,
        isSavedSession: false,
        drift: null
      };

      toast.success("Data loaded successfully! Generating document...", { id: toastId });

      const { triggerPrint, triggerDownloadPDF } = await import("@/print/utils/printUtils");
      if (actionType === "print") {
        triggerPrint("ledger", fullPrintData, "en");
      } else {
        triggerDownloadPDF("ledger", fullPrintData, `Ledger-Live-${format(new Date(), "yyyy-MM-dd")}`, "en");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to generate print report", { id: toastId });
    } finally {
      setIsPrinting(false);
    }
  };

  const printDataHistory = useMemo(() => {
    if (!viewingSessionDetails) return null;
    return {
      title: `Ledger Reconciliation Report: ${viewingSessionDetails.session.title}`,
      startDate: viewingSessionDetails.session.startDate,
      endDate: viewingSessionDetails.session.endDate,
      supplierName: "All (Saved Snapshot)",
      buyerName: "All (Saved Snapshot)",
      invoices: viewingSessionDetails.invoices,
      sales: viewingSessionDetails.sales,
      summary: {
        supplier: {
          baseTotal: viewingSessionDetails.session.supplierTotal,
          gross: viewingSessionDetails.liveSummary?.supplier?.gross || 0,
          deductions: viewingSessionDetails.liveSummary?.supplier?.deductions || 0,
          advances: viewingSessionDetails.liveSummary?.supplier?.advances || 0,
          activeCount: viewingSessionDetails.session.supplierInvoiceCount,
        },
        buyer: {
          baseTotal: viewingSessionDetails.session.buyerTotal,
          base: viewingSessionDetails.liveSummary?.buyer?.base || 0,
          adjustments: viewingSessionDetails.liveSummary?.buyer?.adjustments || 0,
          activeCount: viewingSessionDetails.session.buyerInvoiceCount,
        },
        difference: viewingSessionDetails.session.difference,
        matched: Math.abs(Number(viewingSessionDetails.session.difference)) <= tolerance
      },
      isSavedSession: true,
      drift: viewingSessionDetails.drift
    };
  }, [viewingSessionDetails]);

  // Load latest list of sessions from backend
  const refreshSessions = async () => {
    const result = await listLedgerSessionsAction({ page: currentPage, limit: currentLimit });
    if (result.success) {
      setSessions(result.items || result.data || []);
      setSessionsCount(result.totalCount || (result.data || []).length);
    }
  };

  // 3. View Saved Session Details Flow
  const handleViewSession = async (id) => {
    setLoadingSessionId(id);
    try {
      const result = await getLedgerSessionDetailsAction(id);
      if (result.success) {
        setViewingSessionDetails(result.data);
      } else {
        toast.error(result.error || "Failed to load session details");
      }
    } catch (err) {
      toast.error("Failed to load details");
    } finally {
      setLoadingSessionId(null);
    }
  };

  // Toggle saved session lock status
  const handleToggleLock = async (id) => {
    try {
      const result = await toggleLockSessionAction(id);
      if (result.success) {
        toast.success(`Session ${result.data.status === "LOCKED" ? "Locked" : "Unlocked"} successfully!`);
        // Refresh active viewing details if viewing it
        if (viewingSessionDetails && viewingSessionDetails.session.id === id) {
          setViewingSessionDetails(prev => ({
            ...prev,
            session: result.data
          }));
        }
        refreshSessions();
      } else {
        toast.error(result.error || "Failed to change lock status");
      }
    } catch (err) {
      toast.error("Error toggling lock status");
    }
  };

  // Delete saved session
  const handleDeleteSession = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this reconciliation session snapshot?");
    if (!confirmDelete) return;

    try {
      const result = await deleteLedgerSessionAction(id);
      if (result.success) {
        toast.success("Reconciliation session deleted successfully!");
        setViewingSessionDetails(null);
        refreshSessions();
      } else {
        toast.error(result.error || "Failed to delete session");
      }
    } catch (err) {
      toast.error("Error deleting session");
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Ledger & Reconciliation</h1>
        
        {activeTab === "LIVE" && !showSaveForm && !viewingSessionDetails && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePrintLive("print")}
                disabled={isPrinting}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors font-medium text-xs text-foreground bg-background cursor-pointer shrink-0 disabled:opacity-50"
                title="Print Document"
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" />
                <span>{isPrinting ? "Fetching..." : "Print"}</span>
              </button>
              <button
                onClick={() => handlePrintLive("pdf")}
                disabled={isPrinting}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors font-medium text-xs text-foreground bg-background cursor-pointer shrink-0 disabled:opacity-50"
                title="Download PDF"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>{isPrinting ? "Fetching..." : "Download PDF"}</span>
              </button>
            </div>
            <button
              onClick={() => setShowSaveForm(true)}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Save Session Snapshot
            </button>
          </div>
        )}
      </div>

      {/* Tabs Layout */}
      {!viewingSessionDetails && (
        <div className="flex border-b">
          <button
            onClick={() => {
              setActiveTab("LIVE");
              setShowSaveForm(false);
            }}
            className={cn(
              "px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer",
              activeTab === "LIVE"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <BookOpen className="h-4 w-4" />
            Live Reconciliation
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={cn(
              "px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 cursor-pointer",
              activeTab === "HISTORY"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <History className="h-4 w-4" />
            Reconciliation History
          </button>
        </div>
      )}

      {/* Tab Content: Live Reconciliation */}
      {activeTab === "LIVE" && !viewingSessionDetails && (
        <div className="space-y-6">
          {showSaveForm ? (
            <LedgerSessionForm
              summary={initialSummary}
              dateFilter={dateFilter}
              onCancel={() => setShowSaveForm(false)}
              onSuccess={(newSession) => {
                setShowSaveForm(false);
                setSessions(prev => [newSession, ...prev]);
                setActiveTab("HISTORY");
              }}
            />
          ) : (
            <>
              {/* Summary Dashboard widgets */}
              <LedgerDashboard summary={initialSummary} />

              {/* Filters Panel */}
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                  {/* Search Query */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Search Register
                    </span>
                    <DebouncedSearchInput
                      value={searchQuery}
                      onChange={(val) => {
                        setSearchQuery(val);
                        updateFilters({ search: val, invPage: 1, salePage: 1 });
                      }}
                      placeholder="Search #, party..."
                      className="w-full"
                    />
                  </div>

                  {/* Supplier Select */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground block uppercase">
                      Supplier Party
                    </span>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedSupplierId(val);
                        updateFilters({ supplierId: val, invPage: 1, salePage: 1 });
                      }}
                      className="w-full bg-background border rounded-lg px-3 py-2 text-sm h-[38px] focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="ALL">All Suppliers</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Buyer Select */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground block uppercase">
                      Buyer Party
                    </span>
                    <select
                      value={selectedBuyerId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedBuyerId(val);
                        updateFilters({ buyerId: val, invPage: 1, salePage: 1 });
                      }}
                      className="w-full bg-background border rounded-lg px-3 py-2 text-sm h-[38px] focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="ALL">All Buyers</option>
                      {buyers.map(buy => (
                        <option key={buy.id} value={buy.id}>{buy.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground block uppercase">
                      Reconciliation Period
                    </span>
                    <DateRangeFilter
                      value={dateFilter}
                      onChange={(val) => {
                        setDateFilter(val);
                        updateFilters({
                          preset: val.preset,
                          startDate: val.startDate,
                          endDate: val.endDate,
                          month: val.month,
                          invPage: 1,
                          salePage: 1
                        });
                      }}
                    />
                  </div>

                  {/* Limit Selection */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-wider text-muted-foreground block uppercase">
                      Show per page
                    </span>
                    <select
                      value={liveLimit}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        updateFilters({ limit: val, invPage: 1, salePage: 1 });
                      }}
                      className="w-full bg-background border rounded-lg px-3 py-2 text-sm h-[38px] focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value={50}>50 rows</option>
                      <option value={100}>100 rows</option>
                      <option value={200}>200 rows</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Side-by-side Tables */}
              <ReconciliationTable 
                invoices={initialInvoices} 
                sales={initialSales}
                invoicesCount={initialInvoicesCount}
                salesCount={initialSalesCount}
                invPage={invPage}
                salePage={salePage}
                pageSize={liveLimit}
                onInvPageChange={(newPage) => updateFilters({ invPage: newPage })}
                onSalePageChange={(newPage) => updateFilters({ salePage: newPage })}
              />
            </>
          )}
        </div>
      )}

      {/* Tab Content: Reconciliation History List */}
      {activeTab === "HISTORY" && !viewingSessionDetails && (
        <div className="space-y-4">
          <DataTable
            data={sessions}
            emptyMessage="No saved reconciliation snapshots found."
            containerClassName="rounded-xl border bg-card shadow-sm overflow-hidden"
            columns={[
              {
                key: "title",
                label: "Session Title",
                className: "px-6 py-4 font-bold text-primary",
              },
              {
                key: "startDate",
                label: "Audit Period",
                className: "px-6 py-4 whitespace-nowrap text-muted-foreground text-xs",
                render: (row) =>
                  `${format(new Date(row.startDate), "dd MMM yyyy")} to ${format(
                    new Date(row.endDate),
                    "dd MMM yyyy"
                  )}`,
              },
              {
                key: "supplierTotal",
                label: "Supplier Base Total",
                className: "px-6 py-4 text-right font-semibold",
                render: (row, val) => formatRs(val),
              },
              {
                key: "buyerTotal",
                label: "Buyer Base Total",
                className: "px-6 py-4 text-right font-semibold",
                render: (row, val) => formatRs(val),
              },
              {
                key: "difference",
                label: "Difference",
                className: "px-6 py-4 text-right font-bold",
                render: (row, val) => (
                  <span className={Math.abs(Number(val)) <= tolerance ? "text-emerald-600" : "text-rose-600"}>
                    {formatRs(val)}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                className: "px-6 py-4 text-center",
                render: (row, val) => (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                      val === "LOCKED"
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/10 dark:text-rose-400"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/10 dark:text-emerald-400"
                    )}
                  >
                    {val === "LOCKED" ? <Lock className="h-3 w-3 shrink-0" /> : <Unlock className="h-3 w-3 shrink-0" />}
                    {val}
                  </span>
                ),
              },
              {
                key: "counts",
                label: "Counts (S / B)",
                className: "px-6 py-4 text-center text-xs text-muted-foreground",
                render: (row) => `${row.supplierInvoiceCount} / ${row.buyerInvoiceCount}`,
              },
              {
                key: "actions",
                label: "Actions",
                className: "px-6 py-4 text-center",
                sortable: false,
                render: (row) => (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleViewSession(row.id)}
                      className="bg-primary/5 hover:bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                      disabled={loadingSessionId === row.id}
                    >
                      {loadingSessionId === row.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "View Audit Details"
                      )}
                    </button>

                    <button
                      onClick={() => handleToggleLock(row.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                      title={row.status === "LOCKED" ? "Unlock Session" : "Lock Session"}
                    >
                      {row.status === "LOCKED" ? (
                        <Unlock className="h-4 w-4 text-rose-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-emerald-500" />
                      )}
                    </button>

                    <DeleteButton
                      id={row.id}
                      deleteAction={deleteLedgerSessionAction}
                      hardDeleteAction={hardDeleteLedgerSessionAction}
                      label="Reconciliation Session"
                      variant="icon"
                      disabled={row.status === "LOCKED"}
                      onSuccess={() => {
                        setViewingSessionDetails(null);
                        refreshSessions();
                      }}
                    />
                  </div>
                ),
              },
            ]}
          />
          <PaginationControls
            currentPage={currentPage}
            totalCount={sessionsCount}
            limit={currentLimit}
            onPageChange={(newPage) => updateFilters({ page: newPage })}
            onLimitChange={(newLimit) => updateFilters({ limit: newLimit })}
          />
        </div>
      )}

      {/* Viewing Saved Session Detail Page */}
      {viewingSessionDetails && (
        <div className="space-y-6">
          {/* Sub-Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => setViewingSessionDetails(null)}
                className="p-2 border rounded-lg hover:bg-accent transition-colors"
                title="Back to List"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-foreground">{viewingSessionDetails.session.title}</h2>
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border uppercase",
                    viewingSessionDetails.session.status === "LOCKED" 
                      ? "bg-rose-100 text-rose-700 border-rose-200"
                      : "bg-emerald-100 text-emerald-700 border-emerald-200"
                  )}>
                    {viewingSessionDetails.session.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Audit range: {format(new Date(viewingSessionDetails.session.startDate), "dd MMMM yyyy")} to {format(new Date(viewingSessionDetails.session.endDate), "dd MMMM yyyy")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <PrintButtons
                type="ledger"
                data={printDataHistory}
                filename={`Ledger-Snapshot-${viewingSessionDetails.session.title.replace(/\s+/g, "-")}`}
                printConfig={printConfig}
              />
              <button
                onClick={() => handleToggleLock(viewingSessionDetails.session.id)}
                className="flex items-center gap-2 border px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-accent transition-colors"
              >
                {viewingSessionDetails.session.status === "LOCKED" ? (
                  <>
                    <Unlock className="h-3.5 w-3.5 text-rose-600" />
                    Unlock Session
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5 text-emerald-600" />
                    Lock Session
                  </>
                )}
              </button>

              <DeleteButton
                id={viewingSessionDetails.session.id}
                deleteAction={deleteLedgerSessionAction}
                hardDeleteAction={hardDeleteLedgerSessionAction}
                label="Reconciliation Session"
                buttonText="Delete Snapshot"
                disabled={viewingSessionDetails.session.status === "LOCKED"}
                onSuccess={() => {
                  setViewingSessionDetails(null);
                  refreshSessions();
                }}
              />
            </div>
          </div>

          {/* Saved Session Stats Dashboard (incorporating drift analysis) */}
          <LedgerDashboard 
            summary={{
              supplier: {
                baseTotal: viewingSessionDetails.session.supplierTotal,
                gross: viewingSessionDetails.liveSummary.supplier.gross,
                deductions: viewingSessionDetails.liveSummary.supplier.deductions,
                advances: viewingSessionDetails.liveSummary.supplier.advances,
                activeCount: viewingSessionDetails.session.supplierInvoiceCount,
              },
              buyer: {
                baseTotal: viewingSessionDetails.session.buyerTotal,
                base: viewingSessionDetails.liveSummary.buyer.base,
                adjustments: viewingSessionDetails.liveSummary.buyer.adjustments,
                activeCount: viewingSessionDetails.session.buyerInvoiceCount,
              },
              difference: viewingSessionDetails.session.difference,
              matched: Math.abs(Number(viewingSessionDetails.session.difference)) <= 1.00,
              tolerance: DEFAULT_TOLERANCE
            }}
            drift={viewingSessionDetails.drift}
            isSavedSession={true}
          />

          {/* Notes Card */}
          {viewingSessionDetails.session.notes && (
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Session Audit Notes</h3>
              <p className="text-sm text-foreground bg-muted/20 p-3 rounded-lg border italic whitespace-pre-wrap">
                &quot;{viewingSessionDetails.session.notes}&quot;
              </p>
            </div>
          )}

          {/* Tables of transactions from that period */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Period Transaction Registry
            </h3>
            <ReconciliationTable 
              invoices={viewingSessionDetails.invoices} 
              sales={viewingSessionDetails.sales} 
              invoicesCount={viewingSessionDetails.invoices.length}
              salesCount={viewingSessionDetails.sales.length}
              invPage={1}
              salePage={1}
              pageSize={9999}
              onInvPageChange={() => {}}
              onSalePageChange={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
