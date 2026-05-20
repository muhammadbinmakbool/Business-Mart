"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Calculator, ReceiptText, Loader2, PlusCircle, X, Save, AlertCircle } from "lucide-react";
import { createSaleAction, updateSaleAction } from "@/modules/sales/controllers/saleActions";
import { getUnbilledTracksAction } from "@/modules/sales/controllers/trackActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { round, calculateAdjustment, calculateTransactionTotals } from "@/lib/financial";
import { getUnitsByCategory, UNITS, normalizeQuantity, normalizeRate, convertRate, convertFromBase } from "@/lib/units";
import { ADJUSTMENT_TYPES_BUYER } from "@/lib/constants";

export default function SaleForm({ buyers, products, initialData = null }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [partyId, setPartyId] = useState(initialData?.partyId?.toString() || "");
  const [entryDate, setEntryDate] = useState(
    initialData?.entryDate 
      ? new Date(initialData.entryDate).toISOString().split("T")[0] 
      : new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [items, setItems] = useState(
    initialData?.items?.map(item => {
      const track = item.salesTracks?.[0];
      return {
        ...item,
        productId: item.productId.toString(),
        unit: item.unit || "KG",
        rateUnit: item.rateUnit || "KG",
        salesTrackId: track?.id || null,
        intakeNumber: track?.intakeTransaction?.intakeNumber || null
      };
    }) || [{ productId: "", weight: "", rate: "", unit: "KG", rateUnit: "KG", amount: 0 }]
  );
  const [adjustments, setAdjustments] = useState(
    initialData?.adjustments?.map(adj => ({
      ...adj,
      unit: adj.unit || "KG"
    })) || []
  );
  
  // UI State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isNewBuyer, setIsNewBuyer] = useState(false);
  const [newBuyerData, setNewBuyerData] = useState({ name: "", phoneNumber: "", address: "", notes: "" });
  const [currentAdjustment, setCurrentAdjustment] = useState({ 
    adjustmentType: "Commission", 
    method: "PERCENTAGE", 
    value: "", 
    direction: "ADD",
    unit: "KG"
  });

  // Track Suggestions State
  const [unbilledTracks, setUnbilledTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const initialUnbilledTracksRef = React.useRef([]);

  const fetchUnbilledTracks = useCallback(async (buyerId) => {
    setLoadingTracks(true);
    try {
      const result = await getUnbilledTracksAction(buyerId);
      if (result.success) {
        // Filter out tracks that are already selected in items
        const currentSalesTrackIds = items.map(i => i.salesTrackId).filter(Boolean);
        const filteredTracks = result.data.filter(t => !currentSalesTrackIds.includes(t.id));
        setUnbilledTracks(filteredTracks);
        initialUnbilledTracksRef.current = result.data;
      } else {
        toast.error("Failed to load available sold intakes: " + result.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTracks(false);
    }
  }, [items]);

  useEffect(() => {
    if (partyId && partyId !== "new") {
      fetchUnbilledTracks(partyId);
    } else {
      setUnbilledTracks([]);
    }
  }, [partyId]);

  const handleSelectTrack = (track) => {
    const hasOnlyEmptyRow = items.length === 1 && !items[0].productId && !items[0].weight && !items[0].rate;
    
    const originalUnit = track.intakeTransaction?.unit || "KG";
    const originalRateUnit = track.intakeTransaction?.rateUnit || "KG";
    const product = products.find(p => p.id === track.productId);
    
    // Convert rate and weight back to the original unit (e.g. MAUND)
    const displayRate = convertRate(track.sellingRate || track.buyingRate || 0, "KG", originalRateUnit, product);
    const displayWeight = track.netWeight !== null && track.netWeight !== undefined
      ? track.netWeight
      : convertFromBase(track.quantity || 0, originalUnit, product);

    const newRow = {
      productId: track.productId?.toString() || "",
      weight: displayWeight || "",
      rate: displayRate || "",
      unit: originalUnit,
      rateUnit: originalRateUnit,
      salesTrackId: track.id,
      intakeNumber: track.intakeTransaction?.intakeNumber
    };

    if (hasOnlyEmptyRow) {
      setItems([newRow]);
    } else {
      setItems([...items, newRow]);
    }

    setUnbilledTracks(prev => prev.filter(t => t.id !== track.id));
    toast.success(`Prefilled item from Intake ${track.intakeTransaction?.intakeNumber || ""}`);
  };

  // Totals State
  const [totals, setTotals] = useState({ baseAmount: 0, totalWeight: 0, totalAdjustments: 0, finalAmount: 0 });

  // Calculation Logic
  const updateTotals = useCallback(() => {
    // Prepare items for the calculation engine by normalizing them
    const processedItems = items.map(item => {
      const product = products.find(p => p.id === parseInt(item.productId));
      if (!product) return { normalizedWeight: 0, normalizedRate: 0 };

      try {
        const normalizedRate = normalizeRate(item.rate || 0, item.rateUnit || "KG", product);
        const normalizedWeight = normalizeQuantity(item.weight || 0, item.unit || "KG", product);
        return { normalizedWeight, normalizedRate, product };
      } catch (e) {
        return { normalizedWeight: 0, normalizedRate: 0 };
      }
    });

    // Delegate ALL math to the centralized financial engine
    const result = calculateTransactionTotals(processedItems, adjustments);
    setTotals(result);
  }, [items, adjustments, products]);

  useEffect(() => {
    updateTotals();
  }, [updateTotals]);

  // Handlers
  const addItem = () => setItems([...items, { productId: "", weight: "", rate: "", unit: "KG", rateUnit: "KG", amount: 0 }]);
  const removeItem = (index) => {
    const itemToRemove = items[index];
    if (itemToRemove.salesTrackId) {
      const originalTrack = initialUnbilledTracksRef.current.find(t => t.id === itemToRemove.salesTrackId);
      if (originalTrack) {
        setUnbilledTracks(prev => [...prev, originalTrack]);
      }
    }
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    } else {
      setItems([{ productId: "", weight: "", rate: "", unit: "KG", rateUnit: "KG", amount: 0 }]);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Reset unit and rateUnit if product changes
    if (field === "productId") {
        const product = products.find(p => p.id === parseInt(value));
        if (product) {
            newItems[index].unit = product.primaryUnit || "KG";
            newItems[index].rateUnit = product.primaryUnit || "KG";
        }
    }
    
    setItems(newItems);
  };

  const addAdjustment = () => {
    if (!currentAdjustment.value || isNaN(currentAdjustment.value) || parseFloat(currentAdjustment.value) <= 0) {
      toast.error("Please enter a valid positive numeric value");
      return;
    }
    setAdjustments([
      ...adjustments,
      {
        ...currentAdjustment,
        value: parseFloat(currentAdjustment.value),
        unit: currentAdjustment.method === "PER_WEIGHT" ? currentAdjustment.unit : null
      }
    ]);
    setIsAdjustmentModalOpen(false);
    setCurrentAdjustment({ adjustmentType: "Commission", method: "PERCENTAGE", value: "", direction: "ADD", unit: "KG" });
  };

  const removeAdjustment = (index) => {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  };


  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!partyId) return toast.error("Please select a buyer");
    if (items.some(i => !i.productId || !i.weight || !i.rate)) {
      return toast.error("Please fill all item fields");
    }

    setIsSubmitting(true);
    try {
      const data = {
        partyId,
        entryDate,
        notes,
        items: items.map(item => {
          const product = products.find(p => p.id === parseInt(item.productId));
          const normalizedRate = product ? normalizeRate(item.rate || 0, item.rateUnit || "KG", product) : 0;
          const normalizedWeight = product ? normalizeQuantity(item.weight || 0, item.unit || "KG", product) : 0;
          const amount = round(normalizedWeight * normalizedRate);
          return {
            productId: parseInt(item.productId),
            weight: parseFloat(item.weight),
            unit: item.unit || "KG",
            rate: parseFloat(item.rate),
            rateUnit: item.rateUnit || "KG",
            normalizedWeight,
            amount,
            salesTrackId: item.salesTrackId ? parseInt(item.salesTrackId) : null
          };
        }),
        adjustments,
        newPartyData: isNewBuyer ? { ...newBuyerData, partyType: "BUYER" } : null
      };

      let result;
      if (initialData) {
        result = await updateSaleAction(initialData.id, data);
      } else {
        result = await createSaleAction(data);
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(initialData ? "Invoice updated successfully" : "Sale invoice created successfully");
        
        if (e.nativeEvent.submitter?.name === "saveAndAnother" && !initialData) {
          // Reset form for next entry
          setPartyId("");
          setItems([{ productId: "", weight: "", rate: "", unit: "KG", rateUnit: "KG", amount: 0 }]);
          setAdjustments([]);
          setNotes("");
          toast.info("Form reset for next entry");
          document.querySelector('select')?.focus();
        } else {
          router.push(`/sales/${initialData?.id || result.id || ""}`);
        }
      }
    } catch (error) {
      toast.error(initialData ? "Failed to update invoice" : "Failed to create sale");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {initialData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800 animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold">Operational Warning</p>
            <p>You are modifying a previously finalized invoice (<span className="font-mono font-bold uppercase">{initialData.saleNumber}</span>). All totals will be recalculated from source items and adjustments upon saving.</p>
          </div>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b">
        {initialData && (
           <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Invoice #</label>
            <div className="bg-muted px-4 py-3 rounded-lg font-mono font-bold text-muted-foreground border border-dashed cursor-not-allowed">
              {initialData.saleNumber}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Buyer (Party)</label>
          <select
            autoFocus
            value={partyId}
            onChange={(e) => {
              setPartyId(e.target.value);
              setIsNewBuyer(e.target.value === "new");
            }}
            className="w-full bg-background text-foreground border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            required
          >
            <option value="" className="bg-background text-foreground">Select Buyer...</option>
            <option value="new" className="font-bold text-primary bg-background">➕ Add New Buyer</option>
            <hr />
            {buyers.map((buyer) => (
              <option key={buyer.id} value={buyer.id} className="bg-background text-foreground">
                {buyer.name} {buyer.phoneNumber ? `(${buyer.phoneNumber})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Conditional New Buyer Fields */}
        {isNewBuyer && (
          <div className="md:col-span-3 bg-primary/5 border border-primary/20 rounded-xl p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">New Buyer Master Data</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Buyer Name</label>
                <input
                  required={isNewBuyer}
                  value={newBuyerData.name}
                  onChange={(e) => setNewBuyerData({ ...newBuyerData, name: e.target.value })}
                  placeholder="e.g. Salim & Co"
                  className="w-full bg-background border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Phone Number</label>
                <input
                  required={isNewBuyer}
                  value={newBuyerData.phoneNumber}
                  onChange={(e) => setNewBuyerData({ ...newBuyerData, phoneNumber: e.target.value })}
                  placeholder="e.g. 03450000000"
                  className="w-full bg-background border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Address (Optional)</label>
                <input
                  value={newBuyerData.address}
                  onChange={(e) => setNewBuyerData({ ...newBuyerData, address: e.target.value })}
                  placeholder="Street, City, Market, etc."
                  className="w-full bg-background border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2 md:col-span-2 lg:col-span-4">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Buyer Notes (Optional)</label>
                <textarea
                  value={newBuyerData.notes}
                  onChange={(e) => setNewBuyerData({ ...newBuyerData, notes: e.target.value })}
                  rows={2}
                  placeholder="Special instructions for this buyer..."
                  className="w-full bg-background border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Entry Date</label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="w-full bg-background border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            required
          />
        </div>
      </div>

      {/* 1.5 Available Sold Intakes Suggestions */}
      {partyId && partyId !== "new" && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          {loadingTracks ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/20 border rounded-xl">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading available sold intakes...</span>
            </div>
          ) : unbilledTracks.length > 0 ? (
            <div className="bg-card border rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    Available Sold Intakes (Suggestions)
                  </h4>
                  <p className="text-xs text-muted-foreground">Select an intake to prefill item details (fully editable).</p>
                </div>
                <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                  {unbilledTracks.length} Available
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {unbilledTracks.map((track) => {
                  const originalUnit = track.intakeTransaction?.unit || "KG";
                  const product = products.find(p => p.id === track.productId);
                  const displayRate = convertRate(track.sellingRate || track.buyingRate || 0, "KG", originalUnit, product);
                  const displayWeight = track.netWeight !== null && track.netWeight !== undefined
                    ? track.netWeight
                    : convertFromBase(track.quantity || 0, originalUnit, product);

                  return (
                    <div
                      key={track.id}
                      onClick={() => handleSelectTrack(track)}
                      className="flex items-center justify-between p-4 rounded-xl border bg-background hover:border-primary hover:bg-primary/5 transition-all text-left cursor-pointer group shadow-sm"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-primary">
                          {track.intakeTransaction?.intakeNumber || `Track #${track.id}`}
                        </div>
                        <div className="text-sm font-bold text-card-foreground group-hover:text-primary transition-colors">
                          {track.product?.name || "Unknown Product"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Rate: Rs. {displayRate} / {originalUnit}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black">{displayWeight} {originalUnit}</div>
                        <div className="text-[10px] text-primary font-bold uppercase group-hover:underline mt-1">
                          + Add
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* 2. Items Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Products & Rates
          </h3>
          <button
            type="button"
            onClick={addItem}
            className="text-xs font-bold bg-primary/10 text-primary px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Add Row
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b">
                <th className="px-4 py-3 w-[40%]">Product</th>
                <th className="px-4 py-3 text-right">Gross Weight</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => {
                const product = products.find(p => p.id === parseInt(item.productId));
                const compatibleUnits = product ? getUnitsByCategory(product.category) : [];

                return (
                  <tr key={index} className="group">
                    <td className="px-2 py-2">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(index, "productId", e.target.value)}
                        className="w-full bg-background text-foreground border-none rounded-lg px-2 py-2 focus:ring-1 focus:ring-primary/50 outline-none font-medium"
                        required
                      >
                        <option value="" className="bg-background text-foreground">Select Product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id} className="bg-background text-foreground">
                            {p.name}
                          </option>
                        ))}
                      </select>
                      {item.intakeNumber && (
                        <div className="text-[10px] text-primary font-bold px-2 mt-1 flex items-center gap-1">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          Intake: {item.intakeNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.weight}
                          onChange={(e) => updateItem(index, "weight", e.target.value)}
                          className="w-full bg-transparent border-none text-right font-mono px-2 py-2 focus:ring-1 focus:ring-primary/50 outline-none"
                          required
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, "unit", e.target.value)}
                          className="bg-muted text-foreground text-[10px] font-bold uppercase rounded px-1.5 py-1 border-none outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-20"
                          disabled={!item.productId}
                        >
                          {compatibleUnits.map(u => (
                            <option key={u.id} value={u.id} className="bg-background text-foreground">{u.id}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) => updateItem(index, "rate", e.target.value)}
                          className="w-full bg-transparent border-none text-right font-mono px-2 py-2 focus:ring-1 focus:ring-primary/50 outline-none"
                          required
                        />
                        <select
                          value={item.rateUnit}
                          onChange={(e) => updateItem(index, "rateUnit", e.target.value)}
                          className="bg-muted text-foreground text-[10px] font-bold uppercase rounded px-1.5 py-1 border-none outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-20"
                          disabled={!item.productId}
                        >
                          {compatibleUnits.map(u => (
                            <option key={u.id} value={u.id} className="bg-background text-foreground">/{u.id}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-bold tabular-nums">
                      {(() => {
                        const product = products.find(p => p.id === parseInt(item.productId));
                        if (!product) return "0";
                        try {
                           const normalizedRate = normalizeRate(item.rate || 0, item.rateUnit || "KG", product);
                           const normalizedWeight = normalizeQuantity(item.weight || 0, item.unit || "KG", product);
                           return round(normalizedWeight * normalizedRate).toLocaleString();
                        } catch (e) {
                           return "0";
                        }
                      })()}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>
      </div>

      {/* 3. Adjustments / Charges Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Billing Adjustments</h3>
            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="text-xs font-bold border border-primary/30 text-primary px-3 py-2 rounded-lg hover:bg-primary/5 transition-colors flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Adjustment
            </button>
          </div>
          
          <div className="space-y-2">
            {adjustments.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed rounded-xl opacity-40">
                <p className="text-xs">No adjustments added.</p>
              </div>
            ) : (
              adjustments.map((adj, index) => {
                const amount = calculateAdjustment(adj.method, adj.value, { 
                  baseAmount: totals.baseAmount, 
                  totalWeight: totals.totalWeight,
                  bagCount: totals.totalBagCount || 0,
                  adjustmentUnit: adj.unit
                });
                return (
                  <div key={index} className="flex items-center justify-between bg-muted/30 px-4 py-3 rounded-lg border group">
                    <div>
                      <div className="font-bold text-sm">{adj.adjustmentType}</div>
                      <div className="text-[10px] uppercase text-muted-foreground font-semibold">
                        {adj.method === "PERCENTAGE" ? `${adj.value}%` : 
                         adj.method === "PER_WEIGHT" ? `Rs. ${adj.value} per ${adj.unit || "KG"}` : 
                         `Fixed Rs. ${adj.value}`} 
                        {" • "} 
                        <span className={adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"}>
                          {adj.direction}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn(
                        "font-mono font-bold text-sm",
                        adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {adj.direction === "ADD" ? "+" : "-"} {amount.toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAdjustment(index)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-4 space-y-2">
             <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Internal Notes</label>
             <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special billing notes or instructions..."
                className="w-full bg-background border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
             />
          </div>
        </div>

        {/* 4. Invoice Summary */}
        <div className="bg-primary/5 rounded-2xl p-8 space-y-6 border border-primary/10">
          <h3 className="font-bold text-xl flex items-center gap-2 border-b border-primary/20 pb-4">
            <ReceiptText className="h-6 w-6 text-primary" />
            Billing Summary
          </h3>
          
          <div className="space-y-4 font-medium">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total Gross Weight</span>
              <span className="font-mono">{totals.totalWeight.toLocaleString()} KG</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Base Amount</span>
              <span className="text-lg">Rs. {totals.baseAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-y border-primary/10">
              <span className="text-muted-foreground">Total Adjustments</span>
              <span className={cn(
                "text-lg",
                totals.totalAdjustments > 0 ? "text-emerald-600" : totals.totalAdjustments < 0 ? "text-rose-600" : ""
              )}>
                {totals.totalAdjustments > 0 ? "+" : ""} {totals.totalAdjustments.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-end pt-4">
              <span className="font-bold text-lg">Final Total</span>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1 opacity-60">Total Receivable</div>
                <span className="text-4xl font-black text-primary tracking-tighter">
                  Rs. {totals.finalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-3">
            <button
              type="submit"
              name="saveAndClose"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-black text-lg shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:translate-y-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  {initialData ? <Save className="h-6 w-6" /> : <ReceiptText className="h-6 w-6" />}
                  {initialData ? "UPDATE INVOICE" : "GENERATE & CLOSE"}
                </>
              )}
            </button>

            {!initialData && (
              <button
                type="submit"
                name="saveAndAnother"
                disabled={isSubmitting}
                className="w-full bg-background border-2 border-primary/20 text-primary py-3 rounded-xl font-bold text-sm hover:bg-primary/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <PlusCircle className="h-4 w-4" />
                SAVE & ADD ANOTHER
              </button>
            )}

            <p className="text-[10px] text-center text-muted-foreground mt-4 font-bold uppercase tracking-widest">
              Review all items and charges before saving
            </p>
          </div>
        </div>
      </div>

      {/* 5. Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/50">
              <h3 className="font-bold">Add Billing Adjustment</h3>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="p-1 hover:bg-background rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Type</label>
                <select 
                  value={currentAdjustment.adjustmentType}
                  onChange={e => setCurrentAdjustment({...currentAdjustment, adjustmentType: e.target.value})}
                  className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {ADJUSTMENT_TYPES_BUYER.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Method</label>
                  <select 
                    value={currentAdjustment.method}
                    onChange={e => {
                      const method = e.target.value;
                      setCurrentAdjustment({
                        ...currentAdjustment, 
                        method,
                        unit: method === "PER_WEIGHT" ? "KG" : null
                      });
                    }}
                    className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="PERCENTAGE">% Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                    <option value="PER_WEIGHT">Per Weight</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Direction</label>
                  <select 
                    value={currentAdjustment.direction}
                    onChange={e => setCurrentAdjustment({...currentAdjustment, direction: e.target.value})}
                    className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="ADD">Add (+)</option>
                    <option value="SUBTRACT">Subtract (-)</option>
                  </select>
                </div>
              </div>

              {currentAdjustment.method === "PER_WEIGHT" && (
                <div className="space-y-2 animate-in slide-in-from-top duration-100">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Weight Unit</label>
                  <select 
                    value={currentAdjustment.unit || "KG"}
                    onChange={e => setCurrentAdjustment({...currentAdjustment, unit: e.target.value})}
                    className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-card-foreground"
                  >
                    <option value="KG">KG</option>
                    <option value="MAUND">Maund</option>
                    <option value="BAG">Bag</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Value</label>
                <input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={currentAdjustment.value}
                  onChange={e => setCurrentAdjustment({...currentAdjustment, value: e.target.value})}
                  className="w-full bg-background border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-lg"
                  autoFocus
                />
              </div>

              <button
                type="button"
                onClick={addAdjustment}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold mt-4 hover:opacity-90 transition-opacity"
              >
                Add to Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
