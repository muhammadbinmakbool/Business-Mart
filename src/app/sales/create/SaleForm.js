"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Plus, Trash2, Calculator, ReceiptText, Loader2, PlusCircle, X, Save, AlertCircle } from "lucide-react";
import { createSaleAction, updateSaleAction } from "@/modules/sales/controllers/saleActions";
import { getBuyerDraftSuggestionAction } from "@/modules/sales-workbench/controllers/workbenchActions";
import DraftSuggestionCard from "@/components/sales/DraftSuggestionCard";
import { showToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { cn, getLocalDateString } from "@/lib/utils";
import { round, calculateAdjustment, calculateTransactionTotals } from "@/lib/financial";
import { getUnitsByCategory, UNITS, normalizeQuantity, normalizeRate, convertRate, convertFromBase, UNIT_IDS } from "@/lib/units";
import { getPreferredWeightUnit, getPreferredRateUnit } from "@/lib/display-units";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { getErrorPresentation } from "@/lib/errors/errorPresentation";
import { useKeyboardFlow } from "@/hooks/useKeyboardFlow";
import { fastEntryMemoryStore } from "@/lib/fastEntryMemoryStore";
import { useFastEntryAssistant } from "@/modules/fast-entry-assistant/hooks/useFastEntryAssistant";
import InlineSuggestionBox from "@/modules/fast-entry-assistant/components/InlineSuggestionBox";

export default function SaleForm({ buyers, products, initialData = null, adjustmentDefinitions = [], backUrl = "", flags = null }) {

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "", type: "error" });
  const [saveAndNew, setSaveAndNew] = useState(false);
  const saveAndNewRef = useRef(false);
  saveAndNewRef.current = saveAndNew;

  const [partyId, setPartyId] = useState(initialData?.partyId?.toString() || "");
  const [entryDate, setEntryDate] = useState(
    initialData?.entryDate 
      ? getLocalDateString(initialData.entryDate) 
      : getLocalDateString()
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
        salesTrackId: item.salesTrackId || track?.id || null,
        intakeNumber: item.intakeNumber || track?.intakeTransaction?.intakeNumber || null
      };
    }) || [{ productId: "", weight: "", rate: "", unit: "KG", rateUnit: "KG", amount: 0 }]
  );

  const buyerOptions = useMemo(() => [
    { value: "new", label: "➕ Add New Buyer", specialOption: true },
    ...buyers.map(b => ({
      value: b.id.toString(),
      label: b.name,
      subLabel: b.phoneNumber
    }))
  ], [buyers]);

  const productOptions = useMemo(() => products.map(p => ({
    value: p.id.toString(),
    label: p.name
  })), [products]);

  const assistantSuggestions = useFastEntryAssistant({
    context: "sales",
    partyId,
    items
  });

  const applyBuyerSuggestion = () => {
    if (!partyId && assistantSuggestions.party) {
      setPartyId(assistantSuggestions.party);
      setIsNewBuyer(assistantSuggestions.party === "new");
    }
  };

  const applyItemProductSuggestion = (index, prodId) => {
    if (index >= 0 && index < items.length && !items[index].productId) {
      updateItem(index, "productId", prodId);
    }
  };

  const applyItemRateSuggestion = (index, rateVal) => {
    if (index >= 0 && index < items.length && !items[index].rate) {
      updateItem(index, "rate", rateVal);
    }
  };

  const applyItemUnitSuggestion = (index, unitVal) => {
    if (index >= 0 && index < items.length && !items[index].unit) {
      updateItem(index, "unit", unitVal);
    }
  };

  const suggestedBuyer = buyers.find(b => b.id.toString() === assistantSuggestions.party);
  const [adjustments, setAdjustments] = useState(() => {
    if (initialData?.adjustments) {
      return initialData.adjustments.map(adj => ({
        ...adj,
        unit: adj.unit || "KG",
        isUserEditable: typeof adj.isUserEditable !== "undefined" && adj.isUserEditable !== null ? adj.isUserEditable : true
      }));
    }
    return (adjustmentDefinitions || [])
      .filter(d => d.isEnabledByDefault)
      .map(d => ({
        code: d.code,
        adjustmentType: d.name,
        method: d.method,
        value: d.defaultConfiguredValue !== null ? d.defaultConfiguredValue : 0,
        direction: d.direction,
        unit: "KG",
        isUserEditable: d.isUserEditable
      }));
  });
  
  // ── Keyboard Flow: dynamic field array ──
  const saleFields = useMemo(() => {
    if (initialData) return []; // Disable keyboard flow in edit mode
    const fields = [
      { name: "partyId", next: items.length > 0 ? "item-0-productId" : "notes", prev: null },
    ];
    items.forEach((_, i) => {
      const nextProductId = i < items.length - 1 ? `item-${i + 1}-productId` : "notes";
      fields.push({ name: `item-${i}-productId`, next: `item-${i}-weight`, prev: i === 0 ? "partyId" : `item-${i - 1}-rate` });
      fields.push({ name: `item-${i}-weight`, next: `item-${i}-rate`, prev: `item-${i}-productId` });
      fields.push({ name: `item-${i}-rate`, next: nextProductId, prev: `item-${i}-weight` });
    });
    fields.push({ name: "notes", next: null, prev: items.length > 0 ? `item-${items.length - 1}-rate` : "partyId" });
    return fields;
  }, [items.length, initialData]);

  // Keyboard Ctrl+Enter submit handler
  const handleKeyboardSubmit = useCallback(() => {
    const form = document.querySelector('form');
    if (!form) return;
    const submitBtn = saveAndNewRef.current
      ? form.querySelector('button[name="saveAndAnother"]')
      : form.querySelector('button[name="saveAndClose"]');
    submitBtn?.click();
  }, []);

  const { registerField } = useKeyboardFlow({
    fields: saleFields,
    onSubmit: handleKeyboardSubmit,
    onCancel: () => router.push(backUrl || "/sales"),
    enableSmartDefaults: true,
  });

  // Multi-line entry: when Enter on last item's rate, add new row
  const handleLastRateKeyDown = useCallback((e, index) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      index === items.length - 1 &&
      items[index]?.rate
    ) {
      e.preventDefault();
      e.stopPropagation();
      addItem();
      // Focus new row's product select after React renders
      requestAnimationFrame(() => {
        document.querySelector(`[data-field="item-${index + 1}-productId"]`)?.focus();
      });
    }
  }, [items]);

  // UI State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isNewBuyer, setIsNewBuyer] = useState(false);
  const [newBuyerData, setNewBuyerData] = useState({ name: "", phoneNumber: "", address: "", notes: "" });
  const [currentAdjustment, setCurrentAdjustment] = useState({ 
    code: null,
    adjustmentType: "Custom", 
    method: "FIXED", 
    value: "", 
    direction: "ADD",
    unit: "KG"
  });
  // Centralized Suggestions Engine State
  const [draftSuggestion, setDraftSuggestion] = useState(null);
  const [loadingDraftSuggestion, setLoadingDraftSuggestion] = useState(false);

  useEffect(() => {
    // Skip suggestion lookup if initialData already contains items or is marked as prefilled
    if (initialData?.prefilled === true || (initialData?.items && initialData.items.length > 0)) {
      setDraftSuggestion(null);
      return;
    }

    if (partyId && partyId !== "new" && flags?.salesMode !== "DIRECT" && flags?.enablePrefilledInvoices !== false) {
      setLoadingDraftSuggestion(true);
      getBuyerDraftSuggestionAction(partyId)
        .then(res => {
          if (res.success && res.draft) {
            setDraftSuggestion(res.draft);
          } else {
            setDraftSuggestion(null);
          }
        })
        .catch(err => console.error("Error loading drafts:", err))
        .finally(() => setLoadingDraftSuggestion(false));
    } else {
      setDraftSuggestion(null);
    }
  }, [partyId, flags, initialData]);

  const handleApplyPrefill = (suggestionToApply) => {
    const target = suggestionToApply || draftSuggestion;
    if (!target) return;
    const newItems = target.items.map(item => ({
      productId: item.productId.toString(),
      weight: item.weight.toString(),
      rate: item.rate.toString(),
      unit: item.unit || "KG",
      rateUnit: item.rateUnit || "KG",
      salesTrackId: item.salesTrackId || null,
      intakeNumber: item.intakeNumber || null,
      amount: Number(item.weight) * Number(item.rate)
    }));
    setItems(newItems);
    showToast.success("Draft items prefilled successfully!");
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

  // Client-safe initial mount preference loader to prevent hydration mismatch
  useEffect(() => {
    if (!initialData && items.length === 1 && items[0].productId === "") {
      setItems([{ 
        productId: "", 
        weight: "", 
        rate: "", 
        unit: getPreferredWeightUnit() || "KG", 
        rateUnit: getPreferredRateUnit() || "KG", 
        amount: 0 
      }]);
    }
    setCurrentAdjustment(prev => ({
      ...prev,
      unit: getPreferredWeightUnit() || "KG"
    }));
  }, []);



  // Handlers
  const addItem = () => setItems([...items, { 
    productId: "", 
    weight: "", 
    rate: "", 
    unit: getPreferredWeightUnit() || "KG", 
    rateUnit: getPreferredRateUnit() || "KG", 
    amount: 0 
  }]);

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
      setItems([{ 
        productId: "", 
        weight: "", 
        rate: "", 
        unit: getPreferredWeightUnit() || "KG", 
        rateUnit: getPreferredRateUnit() || "KG", 
        amount: 0 
      }]);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // Reset unit and rateUnit if product changes
    if (field === "productId") {
        const product = products.find(p => p.id === parseInt(value));
        if (product) {
            const isProdBag = product.primaryUnit === "BAG" || product.category === "BAG";
            if (isProdBag) {
                newItems[index].unit = "BAG";
                newItems[index].rateUnit = "BAG";
            } else {
                const compatible = getUnitsByCategory(product.category);
                const prefWeight = getPreferredWeightUnit();
                const prefRate = getPreferredRateUnit();

                newItems[index].unit = compatible.some(u => u.id === prefWeight) ? prefWeight : (product.primaryUnit || "KG");
                newItems[index].rateUnit = compatible.some(u => u.id === prefRate) ? prefRate : (product.primaryUnit || "KG");
            }
        }
    }
    
    setItems(newItems);
  };

  const addAdjustment = () => {
    if (!currentAdjustment.value || isNaN(currentAdjustment.value) || parseFloat(currentAdjustment.value) <= 0) {
      showToast.error("Please enter a valid positive numeric value");
      return;
    }
    const selectedDef = currentAdjustment.code ? adjustmentDefinitions.find(d => d.code === currentAdjustment.code) : null;
    setAdjustments([
      ...adjustments,
      {
        code: currentAdjustment.code || "CUSTOM",
        adjustmentType: currentAdjustment.adjustmentType,
        method: currentAdjustment.method,
        value: parseFloat(currentAdjustment.value),
        direction: currentAdjustment.direction,
        unit: currentAdjustment.method === "PER_WEIGHT" ? currentAdjustment.unit : null,
        isUserEditable: selectedDef ? selectedDef.isUserEditable : true
      }
    ]);
    setIsAdjustmentModalOpen(false);
    setCurrentAdjustment({ code: null, adjustmentType: "Custom", method: "FIXED", value: "", direction: "ADD", unit: getPreferredWeightUnit() || "KG" });
  };

  const removeAdjustment = (index) => {
    setAdjustments(adjustments.filter((_, i) => i !== index));
  };


  async function handleSubmit(e) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!partyId) return showToast.error("Please select a buyer");
    if (items.some(i => !i.productId || !i.weight || !i.rate)) {
      return showToast.error("Please fill all item fields");
    }

    if (items.some(i => Number(i.weight) <= 0 || Number(i.rate) <= 0)) {
      setErrorModal({
        isOpen: true,
        title: "Invalid Negative Parameters",
        message: "Weight, quantity, and rate parameters must be positive numbers greater than zero.",
        type: "error"
      });
      return;
    }

    const salesMode = flags?.salesMode || "HYBRID";
    if (salesMode === "TRACKED" && items.some(i => !i.salesTrackId)) {
      const proceed = window.confirm(
        "TRACKED mode is enabled, but some items are not linked to any intake transaction. Do you wish to proceed and save this invoice anyway?"
      );
      if (!proceed) return;
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
        const presentation = getErrorPresentation(result);
        setErrorModal({
          isOpen: true,
          title: presentation.title,
          message: presentation.message,
          type: presentation.type
        });
      } else {
        showToast.success(initialData ? "Invoice updated successfully" : "Sale invoice created successfully");
        
        // Save to memory store on successful save
        if (!initialData) {
          if (partyId) fastEntryMemoryStore.setLastValue("lastBuyer", partyId, "sales");
          if (items.length > 0) {
            const lastItem = items[items.length - 1];
            if (lastItem.productId) fastEntryMemoryStore.setLastValue("lastProduct", lastItem.productId, "sales");
            if (lastItem.rate) fastEntryMemoryStore.setLastValue("lastRate", lastItem.rate, "sales");
            if (lastItem.unit) fastEntryMemoryStore.setLastValue("lastUnit", lastItem.unit, "sales");
          }
        }
        
        if (e.nativeEvent.submitter?.name === "saveAndAnother" && !initialData) {
          // Save & New: keep partyId, clear items/adjustments/notes
          setItems([{ productId: "", weight: "", rate: "", unit: "KG", rateUnit: "KG", amount: 0 }]);
          setAdjustments([]);
          setNotes("");
          showToast.info("Form reset for next entry");
          // Focus first item's product if keeping party, otherwise party select
          requestAnimationFrame(() => {
            if (partyId && partyId !== "new") {
              document.querySelector('[data-field="item-0-productId"]')?.focus();
            } else {
              document.querySelector('select')?.focus();
            }
          });
        } else {
          const dest = `/sales/${initialData?.id || result.id || ""}`;
          router.push(backUrl ? `${dest}?backUrl=${encodeURIComponent(backUrl)}` : dest);
        }
      }
    } catch (error) {
      setErrorModal({
        isOpen: true,
        title: "Unexpected Error Occurred",
        message: error.message || "An unexpected error occurred while saving the sale invoice.",
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {initialData && (
        <Alert
          type="warning"
          title="Operational Warning"
          message={`You are modifying a previously finalized invoice (${initialData.saleNumber}). All totals will be recalculated from source items and adjustments upon saving.`}
        />
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
          <SearchableSelect
            ref={!initialData ? registerField("partyId") : undefined}
            id="partyId"
            name="partyId"
            required
            autoFocus={!initialData}
            value={partyId}
            onChange={(val) => {
              setPartyId(val);
              setIsNewBuyer(val === "new");
            }}
            options={buyerOptions}
            placeholder="Select Buyer..."
          />
          <InlineSuggestionBox 
            suggestion={assistantSuggestions.party}
            label={suggestedBuyer?.name}
            onApply={applyBuyerSuggestion}
            currentValue={partyId}
          />
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

      {/* Centralized Presentational DraftSuggestionCard */}
      {partyId && partyId !== "new" && (
        <div className="space-y-3">
          {loadingDraftSuggestion ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 bg-muted/20 border rounded-xl animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Searching for intelligent draft suggestions...</span>
            </div>
          ) : (
            <DraftSuggestionCard
              draftSuggestion={draftSuggestion}
              onApply={handleApplyPrefill}
              buttonText="Use Draft"
            />
          )}
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

        <div className="rounded-xl border bg-card">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b">
                <th className="px-4 py-3 w-[40%] rounded-tl-xl">Product</th>
                <th className="px-4 py-3 text-right">Net Weight</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center rounded-tr-xl"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => {
                const product = products.find(p => p.id === parseInt(item.productId));
                const isProdBag = product && (product.primaryUnit === "BAG" || product.category === "BAG");
                const compatibleUnits = product
                  ? (isProdBag
                      ? getUnitsByCategory(product.category).filter(u => u.id === "BAG")
                      : getUnitsByCategory(product.category))
                  : [];

                return (
                  <tr key={index} className="group">
                    <td className="px-2 py-2">
                      <SearchableSelect
                        ref={!initialData ? registerField(`item-${index}-productId`) : undefined}
                        id={`item-${index}-productId`}
                        required
                        value={item.productId}
                        onChange={(val) => updateItem(index, "productId", val)}
                        options={productOptions}
                        placeholder="Select Product..."
                      />
                      {(() => {
                        const rowSuggestion = assistantSuggestions.rowSuggestions?.[index];
                        const suggestedProd = rowSuggestion?.productId 
                          ? products.find(p => p.id.toString() === rowSuggestion.productId.toString())
                          : null;
                        if (suggestedProd && !item.productId) {
                          return (
                            <InlineSuggestionBox 
                              suggestion={rowSuggestion.productId}
                              label={suggestedProd.name}
                              onApply={() => applyItemProductSuggestion(index, rowSuggestion.productId)}
                            />
                          );
                        }
                        return null;
                      })()}
                      {item.intakeNumber && flags?.salesMode !== "DIRECT" && (
                        <div className="text-[10px] text-primary font-bold px-2 mt-1 flex items-center gap-1">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          Intake: {item.intakeNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          ref={!initialData ? registerField(`item-${index}-weight`) : undefined}
                          data-field={`item-${index}-weight`}
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
                      {(() => {
                        const rowSuggestion = assistantSuggestions.rowSuggestions?.[index];
                        if (rowSuggestion?.unit && !item.unit) {
                          return (
                            <InlineSuggestionBox 
                              suggestion={rowSuggestion.unit}
                              label={rowSuggestion.unit}
                              onApply={() => applyItemUnitSuggestion(index, rowSuggestion.unit)}
                            />
                          );
                        }
                        return null;
                      })()}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <input
                          ref={!initialData ? registerField(`item-${index}-rate`) : undefined}
                          data-field={`item-${index}-rate`}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) => updateItem(index, "rate", e.target.value)}
                          onKeyDown={index === items.length - 1 && !initialData ? (e) => handleLastRateKeyDown(e, index) : undefined}
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
                      {(() => {
                        const rowSuggestion = assistantSuggestions.rowSuggestions?.[index];
                        if (rowSuggestion?.rate && !item.rate) {
                          return (
                            <InlineSuggestionBox 
                              suggestion={rowSuggestion.rate}
                              label={`Rs. ${rowSuggestion.rate}`}
                              onApply={() => applyItemRateSuggestion(index, rowSuggestion.rate)}
                            />
                          );
                        }
                        return null;
                      })()}
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
                const definition = adjustmentDefinitions.find(d => d.code === adj.code);
                const isEditable = typeof adj.isUserEditable !== "undefined" && adj.isUserEditable !== null
                  ? adj.isUserEditable
                  : (definition ? definition.isUserEditable : true);
                return (
                  <div key={index} className="flex items-center justify-between bg-muted/30 px-4 py-3 rounded-lg border group gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{adj.adjustmentType}</div>
                      <div className="text-[10px] uppercase text-muted-foreground font-semibold flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span>{adj.method}</span>
                        <span>•</span>
                        <span className={adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"}>
                          {adj.direction}
                        </span>
                        {adj.unit && (
                          <>
                            <span>•</span>
                            <span>per {adj.unit}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="w-24">
                        {isEditable ? (
                          <input
                            type="number"
                            step="any"
                            value={adj.value}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = [...adjustments];
                              updated[index].value = val === "" ? "" : Number(val);
                              setAdjustments(updated);
                            }}
                            className="w-full px-2 py-1 text-xs border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-right"
                          />
                        ) : (
                          <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-1 rounded block text-right">
                            {adj.value}
                          </span>
                        )}
                      </div>

                      <span className={cn(
                        "font-mono font-bold text-sm min-w-[70px] text-right",
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
                ref={!initialData ? registerField("notes") : undefined}
                data-field="notes"
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

            {!initialData && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="saveAndNew"
                  checked={saveAndNew}
                  onChange={(e) => setSaveAndNew(e.target.checked)}
                  className="rounded border-primary text-primary focus:ring-primary/20"
                />
                <label htmlFor="saveAndNew" className="text-[10px] font-semibold text-muted-foreground select-none">
                  Ctrl+Enter → Save & Add Another (keeps Buyer)
                </label>
              </div>
            )}

            <p className="text-[10px] text-center text-muted-foreground mt-4 font-bold uppercase tracking-widest">
              Review all items and charges before saving
            </p>
          </div>
        </div>
      </div>      {/* 5. Adjustment Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Add Billing Adjustment"
        type="info"
        footer={null}
      >
        <div className="space-y-4">
          {(() => {
            const selectedDef = currentAdjustment.code ? adjustmentDefinitions.find(d => d.code === currentAdjustment.code) : null;
            const isCurrentEditable = selectedDef ? selectedDef.isUserEditable : true;
            return (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Adjustment Template / Type</label>
                  <select 
                    value={currentAdjustment.code || "CUSTOM"}
                    onChange={e => {
                      const selectedCode = e.target.value;
                      if (selectedCode === "CUSTOM") {
                        setCurrentAdjustment({
                          code: null,
                          adjustmentType: "Custom",
                          method: "FIXED",
                          value: "",
                          direction: "ADD",
                          unit: "KG"
                        });
                      } else {
                        const def = adjustmentDefinitions.find(d => d.code === selectedCode);
                        if (def) {
                          setCurrentAdjustment({
                            code: def.code,
                            adjustmentType: def.name,
                            method: def.method,
                            value: def.defaultConfiguredValue !== null ? String(def.defaultConfiguredValue) : "",
                            direction: def.direction,
                            unit: "KG"
                          });
                        }
                      }
                    }}
                    className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  >
                    <option value="CUSTOM">Custom (Manual Adjustment)</option>
                    {adjustmentDefinitions.map(def => (
                      <option key={def.code} value={def.code}>{def.name} ({def.code})</option>
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
                          unit: method === "PER_WEIGHT" ? (getPreferredWeightUnit() || "KG") : null
                        });
                      }}
                      disabled={!isCurrentEditable}
                      className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
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
                      disabled={!isCurrentEditable}
                      className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    >
                      <option value="ADD">Add (+)</option>
                      <option value="SUBTRACT">Subtract (-)</option>
                    </select>
                  </div>
                </div>

                {currentAdjustment.method === "PER_WEIGHT" && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Unit</label>
                    <select 
                      value={currentAdjustment.unit || "KG"}
                      onChange={e => setCurrentAdjustment({...currentAdjustment, unit: e.target.value})}
                      disabled={!isCurrentEditable}
                      className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    >
                      {Object.keys(UNITS).map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            );
          })()}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Value</label>
            <input 
              type="number"
              step="0.01"
              placeholder="0.00"
              value={currentAdjustment.value}
              onChange={e => setCurrentAdjustment({...currentAdjustment, value: e.target.value})}
              disabled={(() => {
                const selectedDef = currentAdjustment.code ? adjustmentDefinitions.find(d => d.code === currentAdjustment.code) : null;
                return selectedDef ? !selectedDef.isUserEditable : false;
              })()}
              className="w-full bg-background border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-lg disabled:opacity-60"
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
      </Modal>

      {/* Structured Validation/Conflict Error Modal */}
      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({...errorModal, isOpen: false})}
        title={errorModal.title}
        type={errorModal.type}
        confirmLabel="OK, Understood"
        onConfirm={() => setErrorModal({...errorModal, isOpen: false})}
        cancelLabel={null}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {errorModal.message}
        </p>
      </Modal>
    </form>
  );
}
