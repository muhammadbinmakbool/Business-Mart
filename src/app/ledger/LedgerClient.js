"use client";

import React, { useState, useMemo, useEffect } from "react";
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
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import DateRangeFilter, { filterByDateRange, getDefaultFilterState } from "@/components/DateRangeFilter";
import DebouncedSearchInput from "@/components/DebouncedSearchInput";
import LedgerDashboard from "@/modules/ledger/components/LedgerDashboard";
import ReconciliationTable from "@/modules/ledger/components/ReconciliationTable";
import LedgerSessionForm from "@/modules/ledger/components/LedgerSessionForm";

import { 
  calculateReconciliationSummary, 
  DEFAULT_TOLERANCE 
} from "@/lib/reconciliation";

import { 
  deleteLedgerSessionAction, 
  toggleLockSessionAction, 
  getLedgerSessionDetailsAction,
  listLedgerSessionsAction 
} from "@/modules/ledger/controllers/ledgerActions";

export default function LedgerClient({ 
  initialInvoices = [], 
  initialSales = [], 
  suppliers = [], 
  buyers = [], 
  initialSessions = [] 
}) {
  const [activeTab, setActiveTab] = useState("LIVE"); // LIVE | HISTORY
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("ALL");
  const [selectedBuyerId, setSelectedBuyerId] = useState("ALL");
  
  // Default date filter to "this_month" for monthly balancing operations
  const [dateFilter, setDateFilter] = useState(() => getDefaultFilterState("this_month"));
  
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [viewingSessionDetails, setViewingSessionDetails] = useState(null);
  const [loadingSessionId, setLoadingSessionId] = useState(null);
  
  // Format currency helper
  const formatRs = (val) => {
    return `Rs. ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // 1. Live Data Pipeline (Client-side In-memory Filtering & Calculation)
  const dateFilteredInvoices = useMemo(() => {
    return filterByDateRange(initialInvoices, "entryDate", dateFilter);
  }, [initialInvoices, dateFilter]);

  const dateFilteredSales = useMemo(() => {
    return filterByDateRange(initialSales, "entryDate", dateFilter);
  }, [initialSales, dateFilter]);

  // Apply supplier/buyer and search query filters
  const filteredInvoices = useMemo(() => {
    return dateFilteredInvoices.filter((inv) => {
      // Supplier ID Filter
      if (selectedSupplierId !== "ALL" && inv.partyId !== parseInt(selectedSupplierId)) {
        return false;
      }
      // Buyer ID filter (via SalesTrack cross-linking)
      if (selectedBuyerId !== "ALL") {
        const buyerInt = parseInt(selectedBuyerId);
        const matchesBuyer = inv.items?.some(item =>
          item.intake?.salesTracks?.some(track => track.buyerPartyId === buyerInt)
        );
        if (!matchesBuyer) return false;
      }
      // Search query filter (Invoice # or Supplier Name)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesNum = inv.invoiceNumber?.toLowerCase().includes(query);
        const matchesName = inv.party?.name?.toLowerCase().includes(query);
        return matchesNum || matchesName;
      }
      return true;
    });
  }, [dateFilteredInvoices, selectedSupplierId, selectedBuyerId, searchQuery]);

  const filteredSales = useMemo(() => {
    return dateFilteredSales.filter((sale) => {
      // Buyer ID Filter
      if (selectedBuyerId !== "ALL" && sale.partyId !== parseInt(selectedBuyerId)) {
        return false;
      }
      // Supplier ID Filter (via SalesTrack cross-linking)
      if (selectedSupplierId !== "ALL") {
        const supplierInt = parseInt(selectedSupplierId);
        const matchesSupplier = sale.salesTracks?.some(track => track.supplierPartyId === supplierInt);
        if (!matchesSupplier) return false;
      }
      // Search query filter (Sale # or Buyer Name)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesNum = sale.saleNumber?.toLowerCase().includes(query);
        const matchesName = sale.party?.name?.toLowerCase().includes(query);
        return matchesNum || matchesName;
      }
      return true;
    });
  }, [dateFilteredSales, selectedBuyerId, selectedSupplierId, searchQuery]);

  // 2. Centralized live calculations invocation (NO INLINE FORMULAS)
  const liveSummary = useMemo(() => {
    return calculateReconciliationSummary(filteredInvoices, filteredSales, DEFAULT_TOLERANCE);
  }, [filteredInvoices, filteredSales]);

  // Load latest list of sessions from backend
  const refreshSessions = async () => {
    const result = await listLedgerSessionsAction();
    if (result.success) {
      setSessions(result.data);
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ledger & Reconciliation</h1>
          <p className="text-muted-foreground">
            Verify buyer-side billing totals match supplier-side settlements after adjustments.
          </p>
        </div>
        
        {activeTab === "LIVE" && !showSaveForm && !viewingSessionDetails && (
          <button
            onClick={() => setShowSaveForm(true)}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            Save Session Snapshot
          </button>
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
              "px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2",
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
              "px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2",
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
              summary={liveSummary}
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
              <LedgerDashboard summary={liveSummary} />

              {/* Filters Panel */}
              <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  {/* Search Query */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Search Register
                    </span>
                    <DebouncedSearchInput
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Search #, party..."
                      className="w-full"
                    />
                  </div>

                  {/* Supplier Select */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Supplier Party
                    </span>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Buyer Party
                    </span>
                    <select
                      value={selectedBuyerId}
                      onChange={(e) => setSelectedBuyerId(e.target.value)}
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Reconciliation Period
                    </span>
                    <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
                  </div>
                </div>
              </div>

              {/* Side-by-side Tables */}
              <ReconciliationTable 
                invoices={filteredInvoices} 
                sales={filteredSales} 
              />
            </>
          )}
        </div>
      )}

      {/* Tab Content: Reconciliation History List */}
      {activeTab === "HISTORY" && !viewingSessionDetails && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                  <th className="px-6 py-3">Session Title</th>
                  <th className="px-6 py-3">Audit Period</th>
                  <th className="px-6 py-3 text-right">Supplier Base Total</th>
                  <th className="px-6 py-3 text-right">Buyer Base Total</th>
                  <th className="px-6 py-3 text-right">Difference</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Counts (S / B)</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground italic">
                      No saved reconciliation snapshots found.
                    </td>
                  </tr>
                ) : (
                  sessions.map((sess) => (
                    <tr key={sess.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-bold text-primary">{sess.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-xs">
                        {format(new Date(sess.startDate), "dd MMM yyyy")} to {format(new Date(sess.endDate), "dd MMM yyyy")}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {formatRs(sess.supplierTotal)}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold">
                        {formatRs(sess.buyerTotal)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        <span className={Math.abs(Number(sess.difference)) <= 1.00 ? "text-emerald-600" : "text-rose-600"}>
                          {formatRs(sess.difference)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                          sess.status === "LOCKED" 
                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/10 dark:text-rose-400"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/10 dark:text-emerald-400"
                        )}>
                          {sess.status === "LOCKED" ? (
                            <Lock className="h-3 w-3 shrink-0" />
                          ) : (
                            <Unlock className="h-3 w-3 shrink-0" />
                          )}
                          {sess.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-muted-foreground">
                        {sess.supplierInvoiceCount} / {sess.buyerInvoiceCount}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewSession(sess.id)}
                            className="bg-primary/5 hover:bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            disabled={loadingSessionId === sess.id}
                          >
                            {loadingSessionId === sess.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "View Audit Details"
                            )}
                          </button>
                          
                          <button
                            onClick={() => handleToggleLock(sess.id)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            title={sess.status === "LOCKED" ? "Unlock Session" : "Lock Session"}
                          >
                            {sess.status === "LOCKED" ? (
                              <Unlock className="h-4 w-4 text-rose-500" />
                            ) : (
                              <Lock className="h-4 w-4 text-emerald-500" />
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteSession(sess.id)}
                            className={cn(
                              "p-1.5 rounded-lg text-muted-foreground hover:bg-rose-100 hover:text-rose-600 transition-colors",
                              sess.status === "LOCKED" && "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                            )}
                            disabled={sess.status === "LOCKED"}
                            title={sess.status === "LOCKED" ? "LOCKED: Cannot Delete" : "Delete Session"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

              <button
                onClick={() => handleDeleteSession(viewingSessionDetails.session.id)}
                className={cn(
                  "flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors",
                  viewingSessionDetails.session.status === "LOCKED" && "opacity-40 cursor-not-allowed hover:bg-rose-50"
                )}
                disabled={viewingSessionDetails.session.status === "LOCKED"}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Snapshot
              </button>
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
                "{viewingSessionDetails.session.notes}"
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
            />
          </div>
        </div>
      )}
    </div>
  );
}
