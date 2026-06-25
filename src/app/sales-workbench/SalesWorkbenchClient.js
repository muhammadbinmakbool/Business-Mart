"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ArrowRight, 
  Layers, 
  Calendar, 
  Search, 
  AlertCircle, 
  Check, 
  Plus, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { sellIntakeAction } from "@/modules/intake/controllers/intakeActions";
import SearchableSelect from "@/components/ui/SearchableSelect";
import DraftSuggestionCard from "@/components/sales/DraftSuggestionCard";
import { useHeaderAction } from "@/components/layout/HeaderActionContext";

export default function SalesWorkbenchClient({ buyers = [], products = [], flags = {} }) {
  const router = useRouter();
  const salesMode = flags.salesMode || "HYBRID";
  const isDirectMode = salesMode === "DIRECT";

  const buyerOptions = React.useMemo(() => {
    return buyers.map(b => ({
      value: b.id.toString(),
      label: b.name,
      subLabel: b.phoneNumber
    }));
  }, [buyers]);

  // Data states
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    enabled: true,
    drafts: [],
    pendingIntakes: [],
    recentSales: []
  });

  // Modal / Mapping States
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [selectedIntake, setSelectedIntake] = useState(null);
  const [mappingBuyerId, setMappingBuyerId] = useState("");
  const [mappingRate, setMappingRate] = useState("");
  const [mappingSoldQty, setMappingSoldQty] = useState("");
  const [mappingBardana, setMappingBardana] = useState("");
  const [mappingKhot, setMappingKhot] = useState("");
  const [mappingSubmitting, setMappingSubmitting] = useState(false);

  // Suggestions Selection states
  // Map of buyerId -> set of selected item IDs
  const [selectedDraftItems, setSelectedDraftItems] = useState({});

  // Search filter state for monitor
  const [searchQuery, setSearchQuery] = useState("");

  // Load data from API
  const fetchWorkbenchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sales-workbench/drafts");
      const json = await res.json();
      if (json.success) {
        setData(json);
        // Initialize default selections: select all items by default for all drafts
        const initialSelections = {};
        json.drafts.forEach(draft => {
          initialSelections[draft.buyerId] = new Set(draft.items.map(i => i.id));
        });
        setSelectedDraftItems(initialSelections);
      } else {
        showToast.error("Failed to load workbench data: " + json.error);
      }
    } catch (e) {
      console.error(e);
      showToast.error("Network error loading workbench drafts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkbenchData();
  }, [fetchWorkbenchData]);

  // Handle Mapping Submit
  const handleMappingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIntake) return;
    if (!mappingBuyerId) {
      showToast.error("Please select a buyer.");
      return;
    }
    const rateVal = parseFloat(mappingRate);
    const qtyVal = parseFloat(mappingSoldQty);
    if (isNaN(rateVal) || rateVal <= 0) {
      showToast.error("Please enter a valid rate.");
      return;
    }
    if (isNaN(qtyVal) || qtyVal <= 0) {
      showToast.error("Please enter a valid sold quantity.");
      return;
    }

    const availableWeight = selectedIntake.remainingWeight !== null 
      ? Number(selectedIntake.remainingWeight) 
      : Number(selectedIntake.grossWeight);

    if (qtyVal > availableWeight) {
      showToast.error(`Sold quantity cannot exceed remaining quantity (${availableWeight} ${selectedIntake.unit || 'KG'}).`);
      return;
    }

    setMappingSubmitting(true);
    try {
      const isPartial = qtyVal < availableWeight;
      const res = await sellIntakeAction(selectedIntake.id, {
        buyerPartyId: mappingBuyerId,
        rate: rateVal,
        Bardana: parseFloat(mappingBardana) || 0,
        Khot: parseFloat(mappingKhot) || 0,
        netWeight: qtyVal,
        isPartialSale: isPartial,
        soldQuantity: qtyVal,
        rateUnit: selectedIntake.unit || "KG"
      });

      if (res.success) {
        showToast.success(`Successfully mapped Intake ${selectedIntake.intakeNumber || ""} to buyer!`);
        setMappingModalOpen(false);
        setSelectedIntake(null);
        setMappingBuyerId("");
        setMappingRate("");
        setMappingSoldQty("");
        setMappingBardana("");
        setMappingKhot("");
        // Refresh data
        fetchWorkbenchData();
      } else {
        showToast.error(res.error || "Failed to map intake.");
      }
    } catch (error) {
      console.error(error);
      showToast.error("Error submitting mapping transaction.");
    } finally {
      setMappingSubmitting(false);
    }
  };

  // Open mapping modal
  const openMappingModal = (intake) => {
    const defaultQty = intake.remainingWeight !== null 
      ? Number(intake.remainingWeight) 
      : Number(intake.grossWeight);

    setSelectedIntake(intake);
    setMappingSoldQty(defaultQty.toString());
    setMappingRate("");
    setMappingBuyerId("");
    setMappingModalOpen(true);
  };

  // Toggle item selection in suggestions
  const toggleItemSelection = (buyerId, itemId) => {
    setSelectedDraftItems(prev => {
      const buyerSet = new Set(prev[buyerId] || []);
      if (buyerSet.has(itemId)) {
        buyerSet.delete(itemId);
      } else {
        buyerSet.add(itemId);
      }
      return {
        ...prev,
        [buyerId]: buyerSet
      };
    });
  };

  // Convert draft to invoice
  const convertDraftToInvoice = (draft) => {
    const selectedIds = selectedDraftItems[draft.buyerId] || new Set();
    if (selectedIds.size === 0) {
      showToast.error("Please select at least one item to convert.");
      return;
    }

    const selectedItems = draft.items.filter(i => selectedIds.has(i.id));
    const salesTrackIds = selectedItems
      .filter(i => i.type === "TRACKED" && i.salesTrackId)
      .map(i => i.salesTrackId)
      .join(",");

    const directPrefills = selectedItems
      .filter(i => i.type === "DIRECT")
      .map(i => ({
        productId: i.productId,
        weight: i.weight,
        rate: i.rate,
        unit: i.unit,
        rateUnit: i.rateUnit
      }));

    const queryParams = new URLSearchParams();
    queryParams.set("partyId", draft.buyerId.toString());
    queryParams.set("backUrl", "/sales-workbench");
    queryParams.set("prefilled", "true");

    if (salesTrackIds) {
      queryParams.set("salesTrackIds", salesTrackIds);
    }
    if (directPrefills.length > 0) {
      queryParams.set("directPrefills", JSON.stringify(directPrefills));
    }

    router.push(`/sales/create?${queryParams.toString()}`);
  };

  // Filter for finalized sales search
  const filteredSales = data.recentSales.filter(sale => {
    const name = sale.party?.name?.toLowerCase() || "";
    const search = searchQuery.toLowerCase();
    
    // Match party name
    if (name.includes(search)) return true;
    
    // Match item product name
    const matchesProduct = sale.items?.some(item => 
      item.product?.name?.toLowerCase().includes(search)
    );
    if (matchesProduct) return true;

    // Match intake number references
    const matchesIntake = sale.items?.some(item =>
      item.salesTracks?.some(track => 
        track.intakeTransaction?.intakeNumber?.toLowerCase().includes(search)
      )
    );
    return matchesIntake;
  });

  const { setHeaderAction } = useHeaderAction();

  // Register mode badge + action button in the persistent tab row
  useEffect(() => {
    setHeaderAction(
      <div className="flex items-center gap-3">
        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
          salesMode === "TRACKED" 
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            : salesMode === "DIRECT"
              ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
        }`}>
          {salesMode} MODE
        </span>
        <button
          onClick={() => router.push("/sales/create")}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Direct Invoice
        </button>
      </div>
    );
    return () => setHeaderAction(null);
  }, [setHeaderAction, salesMode, router]);

  return (
    <div className="space-y-4">

      {/* Disabled suggestions banner */}
      {!data.enabled && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200/50 bg-amber-50/50 p-4 text-xs text-amber-800 leading-relaxed dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-sm mb-1">Invoice Suggestions Disabled</span>
            Workbench suggestions have been deactivated by the system administrator. Raw arrival activity and monitor logs remain fully functional.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Section 1: Pending arrivals (5 columns) */}
        <div className="lg:col-span-5 bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-foreground">Pending Arrivals Activity</h2>
              <p className="text-xs text-muted-foreground">Unmapped supplier intakes awaiting allocation (Flow B).</p>
            </div>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
              {data.pendingIntakes.length} Lots
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : data.pendingIntakes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No pending or unmapped intakes available.
            </div>
          ) : (
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {data.pendingIntakes.map(intake => {
                const remaining = intake.remainingWeight !== null ? Number(intake.remainingWeight) : Number(intake.grossWeight);
                return (
                  <div 
                    key={intake.id} 
                    className="p-4 rounded-xl border bg-background/50 hover:bg-background transition-all flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-primary">{intake.intakeNumber}</span>
                        <span className="text-[10px] text-muted-foreground">•</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(intake.entryDate).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-card-foreground">
                        {intake.product?.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Supplier: <span className="font-medium text-foreground">{intake.party?.name}</span>
                      </p>
                      <div className="flex gap-2 text-[10px] font-mono mt-1 text-muted-foreground bg-muted/30 px-2 py-1 rounded w-fit">
                        <span>Gross: {intake.grossWeight} {intake.unit}</span>
                        <span>|</span>
                        <span className="text-amber-600 font-bold dark:text-amber-400">
                          Remaining: {remaining} {intake.unit}
                        </span>
                      </div>
                    </div>

                    {!isDirectMode && (
                      <button
                        onClick={() => openMappingModal(intake)}
                        className="bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground p-2 rounded-lg transition-all text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        Map <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: suggestions (7 columns) */}
        <div className="lg:col-span-7 bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="space-y-0.5">
              <h2 className="text-base font-bold text-foreground">Prefilled Invoice Suggestions</h2>
              <p className="text-xs text-muted-foreground">Intelligent, ready-to-bill draft invoices grouped by Buyer.</p>
            </div>
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
              {data.drafts.length} Suggestions
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !data.enabled ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Prefilled draft invoices are disabled in feature flag configurations.
            </div>
          ) : data.drafts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No unbilled mapping transactions or historical direct patterns found.
            </div>
          ) : (
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {data.drafts.map(draft => {
                const selectedSet = selectedDraftItems[draft.buyerId] || new Set();
                
                return (
                  <div key={draft.buyerId} className="border rounded-xl bg-background/50 overflow-hidden shadow-sm">
                    {/* Buyer Header */}
                    <div className="bg-muted/30 px-4 py-3 border-b flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{draft.buyerName}</h3>
                        {draft.phoneNumber && (
                          <span className="text-[10px] text-muted-foreground">{draft.phoneNumber}</span>
                        )}
                      </div>
                      <button
                        onClick={() => convertDraftToInvoice(draft)}
                        disabled={selectedSet.size === 0}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        Convert to Invoice ({selectedSet.size})
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>                    {/* Centralized Presentational DraftSuggestionCard */}
                    <DraftSuggestionCard
                      draftSuggestion={draft}
                      onApply={() => convertDraftToInvoice(draft)}
                      onToggleItemSelection={toggleItemSelection}
                      selectedItemIds={selectedSet}
                      buttonText="Convert"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Live Sales Activity Monitor */}
      <div className="bg-card/60 backdrop-blur-md rounded-2xl border border-border/50 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-3">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-foreground">Live Sales Activity Monitor</h2>
            <p className="text-xs text-muted-foreground">View recent finalized sales and verify their source logs.</p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search buyer, product, intake..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-full bg-background border border-input rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {searchQuery ? "No matching finalized sales found." : "No recent sales recorded."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground font-bold bg-muted/10">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Invoice #</th>
                  <th className="px-4 py-2.5">Buyer</th>
                  <th className="px-4 py-2.5">Products Sold</th>
                  <th className="px-4 py-2.5">Linked Intakes (Flow B)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSales.map(sale => {
                  return (
                    <tr key={sale.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {new Date(sale.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-semibold font-mono text-primary">
                        INV-{String(sale.id).padStart(4, "0")}
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">{sale.party?.name}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {sale.items?.map((item, idx) => (
                            <div key={idx} className="font-semibold text-card-foreground">
                              {item.product?.name} ({item.weight} {item.unit})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {sale.items?.some(item => item.salesTracks?.length > 0) ? (
                            sale.items.flatMap(item => 
                              item.salesTracks?.map((track, trackIdx) => {
                                const num = track.intakeTransaction?.intakeNumber;
                                if (!num) return null;
                                return (
                                  <span 
                                    key={`${item.id}-${trackIdx}`}
                                    className="bg-primary/10 text-primary font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                                  >
                                    <FileText className="h-3 w-3" />
                                    {num}
                                  </span>
                                );
                              })
                            ).filter(Boolean)
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Direct Sale (No link)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mapping Modal */}
      {mappingModalOpen && selectedIntake && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-base font-bold text-foreground">Map Intake to Buyer</h3>
              <p className="text-xs text-muted-foreground">Creates a Flow B track mapped to buyer billing suggestions.</p>
            </div>

            <div className="bg-muted/20 p-3 rounded-xl border space-y-1 text-xs">
              <div>Intake: <span className="font-bold text-foreground">{selectedIntake.intakeNumber}</span></div>
              <div>Product: <span className="font-bold text-foreground">{selectedIntake.product?.name}</span></div>
              <div>Supplier: <span className="font-bold text-foreground">{selectedIntake.party?.name}</span></div>
              <div>
                Available Weight: <span className="font-bold text-primary">
                  {selectedIntake.remainingWeight !== null ? selectedIntake.remainingWeight : selectedIntake.grossWeight} {selectedIntake.unit}
                </span>
              </div>
            </div>

            <form onSubmit={handleMappingSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">Select Buyer</label>
                <SearchableSelect
                  value={mappingBuyerId}
                  onChange={(val) => setMappingBuyerId(val)}
                  options={buyerOptions}
                  placeholder="Search and Select Buyer..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Rate (Rs.)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Rate"
                    value={mappingRate}
                    onChange={(e) => setMappingRate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Sold Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Qty"
                    value={mappingSoldQty}
                    onChange={(e) => setMappingSoldQty(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Bardana Deduction</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={mappingBardana}
                    onChange={(e) => setMappingBardana(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Khot Deduction</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={mappingKhot}
                    onChange={(e) => setMappingKhot(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setMappingModalOpen(false);
                    setSelectedIntake(null);
                  }}
                  className="px-4 py-2 border rounded-xl text-sm hover:bg-muted/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mappingSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {mappingSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
