"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  ChevronLeft, 
  Search, 
  ShoppingBag, 
  Save, 
  RotateCcw, 
  User, 
  Calendar, 
  Keyboard, 
  DollarSign,
  Plus,
  AlertCircle,
  Printer
} from "lucide-react";

import { createSaleAction, getSaleAction } from "@/modules/sales/controllers/saleActions";
import { getBuyerDraftSuggestionAction } from "@/modules/sales-workbench/controllers/workbenchActions";
import DraftSuggestionCard from "@/components/sales/DraftSuggestionCard";
import { triggerPrint } from "@/print/utils/printUtils";
import { calculateTransactionTotals, round } from "@/lib/financial";
import { normalizeQuantity, normalizeRate, getUnitsByCategory } from "@/lib/units";
import { fastEntryMemoryStore } from "@/lib/fastEntryMemoryStore";
import SearchableSelect from "@/components/ui/SearchableSelect";

// Components
import PosProductTable from "./components/PosProductTable";
import PosTotals from "./components/PosTotals";
import PosCashCalculator from "./components/PosCashCalculator";

export default function PosBillingClient({ 
  buyers = [], 
  products = [], 
  adjustmentDefinitions = [], 
  printConfig = null,
  initialData = null,
  flags = null
}) {
  const router = useRouter();

  // 1. Initial State Resolution (Hydration safe)
  const todayStr = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // 2. Component States
  const [buyerId, setBuyerId] = useState(initialData?.partyId?.toString() || buyers[0]?.id?.toString() || "");
  const [invoiceDate, setInvoiceDate] = useState(
    initialData?.entryDate 
      ? new Date(initialData.entryDate).toISOString().split("T")[0] 
      : todayStr
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [isNewBuyer, setIsNewBuyer] = useState(false);
  const [newBuyerData, setNewBuyerData] = useState({ name: "", phoneNumber: "", address: "", notes: "" });

  const [draftSuggestion, setDraftSuggestion] = useState(null);
  const [loadingDraftSuggestion, setLoadingDraftSuggestion] = useState(false);

  useEffect(() => {
    // Skip suggestion lookup if initialData already contains items or is marked as prefilled
    if (initialData?.prefilled === true || (initialData?.items && initialData.items.length > 0)) {
      setDraftSuggestion(null);
      return;
    }

    if (buyerId && buyerId !== "new" && flags?.salesMode !== "DIRECT" && flags?.enablePrefilledInvoices !== false) {
      setLoadingDraftSuggestion(true);
      getBuyerDraftSuggestionAction(buyerId)
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
  }, [buyerId, flags, initialData]);

  const handleApplyPrefill = (suggestionToApply) => {
    const target = suggestionToApply || draftSuggestion;
    if (!target) return;
    const newItems = target.items.map((item, idx) => ({
      id: `row-${idx}`,
      productId: item.productId.toString(),
      weight: item.weight.toString(),
      unit: item.unit || "KG",
      rate: item.rate.toString(),
      rateUnit: item.rateUnit || "KG",
      amount: Number(item.weight) * Number(item.rate),
      salesTrackId: item.salesTrackId || null,
      intakeNumber: item.intakeNumber || null
    }));
    setItems(newItems);
    toast.success("Draft items prefilled successfully!");
  };

  const [items, setItems] = useState(() => {
    if (initialData?.items?.length > 0) {
      return initialData.items.map((item, idx) => ({
        id: `row-${idx}`,
        productId: item.productId?.toString() || "",
        weight: item.weight?.toString() || "",
        unit: item.unit || "KG",
        rate: item.rate?.toString() || "",
        rateUnit: item.rateUnit || "KG",
        amount: item.amount || 0,
        salesTrackId: item.salesTrackId || null,
        intakeNumber: item.intakeNumber || null
      }));
    }
    return [
      {
        id: "row-0",
        productId: "",
        weight: "",
        unit: "KG",
        rate: "",
        rateUnit: "KG",
        amount: 0
      }
    ];
  });

  // Client-side initialization after hydration is complete
  useEffect(() => {
    if (initialData) return; // Skip memory store recovery for prefilled data
    const last = fastEntryMemoryStore.getLastValue("lastBuyer", "sales");
    if (last && buyers.some(b => b.id.toString() === last.toString())) {
      setBuyerId(last.toString());
    }

    const lastRate = fastEntryMemoryStore.getLastValue("lastRate", "sales");
    const lastUnit = fastEntryMemoryStore.getLastValue("lastUnit", "sales");
    if (lastRate || lastUnit) {
      setItems(prev => prev.map(item => {
        if (!item.productId) {
          return {
            ...item,
            unit: lastUnit || "KG",
            rateUnit: lastUnit || "KG",
            rate: lastRate || ""
          };
        }
        return item;
      }));
    }
  }, [buyers]);

  const [adjustments, setAdjustments] = useState(() => {
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
  const [cashReceived, setCashReceived] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scanner Search States
  const [scannerQuery, setScannerQuery] = useState("");
  const [scannerResults, setScannerResults] = useState([]);
  const [scannerIndex, setScannerIndex] = useState(0);
  const [flashError, setFlashError] = useState(false);

  // Focus Row state
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);

  // Refs for focusing
  const scannerInputRef = useRef(null);
  const cashCalculatorRef = useRef(null);

  const buyerOptions = useMemo(() => [
    { value: "new", label: "➕ Add New Buyer", specialOption: true },
    ...buyers.map(b => ({
      value: b.id.toString(),
      label: b.name,
      subLabel: b.phoneNumber
    }))
  ], [buyers]);

  // 3. Centralized Calculations (Zero-Drift Policy)
  const totals = useMemo(() => {
    const processedItems = items.map(item => {
      const product = products.find(p => p.id === parseInt(item.productId));
      if (!product) return { normalizedWeight: 0, normalizedRate: 0 };
      try {
        const nWeight = normalizeQuantity(item.weight || 0, item.unit || "KG", product);
        const nRate = normalizeRate(item.rate || 0, item.rateUnit || "KG", product);
        return { normalizedWeight: nWeight, normalizedRate: nRate, product };
      } catch (e) {
        return { normalizedWeight: 0, normalizedRate: 0 };
      }
    });

    return calculateTransactionTotals(processedItems, adjustments);
  }, [items, adjustments, products]);

  // Reset function
  const handleReset = useCallback(() => {
    setItems([
      {
        id: "row-" + Date.now(),
        productId: "",
        weight: "",
        unit: "KG",
        rate: "",
        rateUnit: "KG",
        amount: 0
      }
    ]);
    setAdjustments(() => {
      return (adjustmentDefinitions || [])
        .filter(d => d.isEnabledByDefault)
        .map(d => ({
          code: d.code,
          adjustmentType: d.name,
          method: d.method,
          value: d.defaultConfiguredValue !== null ? d.defaultConfiguredValue : 0,
          direction: d.direction,
          unit: "KG"
        }));
    });
    setCashReceived("");
    setNotes("");
    setScannerQuery("");
    setScannerResults([]);
    setIsNewBuyer(false);
    setNewBuyerData({ name: "", phoneNumber: "", address: "", notes: "" });
    setFocusedRowIndex(0);
    toast.info("Invoice cart has been cleared.");
  }, []);

  // 4. Cart Handlers
  const handleAddItem = useCallback(() => {
    setItems(prev => [
      ...prev,
      {
        id: "row-" + Date.now() + Math.random(),
        productId: "",
        weight: "",
        unit: "KG",
        rate: "",
        rateUnit: "KG",
        amount: 0
      }
    ]);
  }, []);

  const handleRemoveItem = useCallback((index) => {
    setItems(prev => {
      if (prev.length <= 1) {
        return [{
          id: "row-" + Date.now(),
          productId: "",
          weight: "",
          unit: "KG",
          rate: "",
          rateUnit: "KG",
          amount: 0
        }];
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleChangeItem = useCallback((index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };

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
            newItems[index].unit = compatible[0]?.id || "KG";
            newItems[index].rateUnit = compatible[0]?.id || "KG";
          }
          
          // Prefill rate from memory if available, or copy rate of same product if already present
          const existingItemWithSameProd = prev.find(item => item.productId === value && item.rate);
          if (existingItemWithSameProd) {
            newItems[index].rate = existingItemWithSameProd.rate;
          } else {
            const lastRate = fastEntryMemoryStore.getLastValue("lastRate", "sales");
            newItems[index].rate = lastRate || "";
          }

          // Auto-append empty row if this is the last row being populated
          if (index === prev.length - 1) {
            newItems.push({
              id: "row-" + Date.now() + Math.random(),
              productId: "",
              weight: "",
              unit: "KG",
              rate: "",
              rateUnit: "KG",
              amount: 0
            });
          }
        } else {
          newItems[index].rate = "";
        }
      }

      // Inline Row amount recalculation
      const prod = products.find(p => p.id === parseInt(newItems[index].productId));
      if (prod) {
        try {
          const nQty = normalizeQuantity(newItems[index].weight || 0, newItems[index].unit || "KG", prod);
          const nRate = normalizeRate(newItems[index].rate || 0, newItems[index].rateUnit || "KG", prod);
          newItems[index].amount = round(nQty * nRate);
        } catch (e) {
          newItems[index].amount = 0;
        }
      } else {
        newItems[index].amount = 0;
      }

      return newItems;
    });
  }, [products]);

  // 5. Adjustments Handlers
  const handleAddAdjustment = useCallback((adj) => {
    setAdjustments(prev => [...prev, adj]);
    toast.success(`Adjustment '${adj.adjustmentType}' added.`);
  }, []);

  const handleRemoveAdjustment = useCallback((index) => {
    setAdjustments(prev => prev.filter((_, i) => i !== index));
    toast.info("Adjustment removed.");
  }, []);

  const handleEditAdjustmentValue = useCallback((index, value) => {
    setAdjustments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value };
      return updated;
    });
  }, []);

  // 6. Barcode Scanner & Search Handler
  const handleScannerSearch = useCallback((e) => {
    e.preventDefault();
    const query = scannerQuery.trim();
    if (!query) {
      // If query is empty, focus the first item row product select
      const cell = document.getElementById("cell-0-productId");
      if (cell) cell.focus();
      return;
    }

    // Lookup matching active products
    const exactId = products.find(p => p.id.toString() === query);
    const exactName = products.find(p => p.name.toLowerCase() === query.toLowerCase());
    const partialMatches = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

    const match = exactId || exactName;

    if (match) {
      addOrIncrementProduct(match);
    } else if (partialMatches.length === 1) {
      addOrIncrementProduct(partialMatches[0]);
    } else if (partialMatches.length > 1) {
      setScannerResults(partialMatches);
      setScannerIndex(0);
    } else {
      // No match warning
      setFlashError(true);
      setTimeout(() => setFlashError(false), 800);
      toast.warning(`No product matches barcode / identifier: "${query}"`);
    }
  }, [scannerQuery, products]);

  const addOrIncrementProduct = (product) => {
    setItems(prev => {
      // Check if product already exists in cart
      const existingIndex = prev.findIndex(item => item.productId === product.id.toString());
      
      if (existingIndex > -1) {
        // Increment quantity by 1
        const newItems = [...prev];
        const newWeight = (parseFloat(newItems[existingIndex].weight) || 0) + 1;
        newItems[existingIndex].weight = newWeight.toString();
        
        // Recalculate amount
        try {
          const nQty = normalizeQuantity(newWeight, newItems[existingIndex].unit, product);
          const nRate = normalizeRate(newItems[existingIndex].rate || 0, newItems[existingIndex].rateUnit, product);
          newItems[existingIndex].amount = round(nQty * nRate);
        } catch (e) {
          newItems[existingIndex].amount = 0;
        }

        toast.success(`Incremented quantity of ${product.name} to ${newWeight}.`);
        return newItems;
      } else {
        // Append new product row
        const isProdBag = product.primaryUnit === "BAG" || product.category === "BAG";
        const unit = isProdBag ? "BAG" : "KG";
        const rateUnit = isProdBag ? "BAG" : "KG";
        const lastRate = fastEntryMemoryStore.getLastValue("lastRate", "sales") || "";
        
        // Calculate amount
        let amount = 0;
        try {
          const nQty = normalizeQuantity(1, unit, product);
          const nRate = normalizeRate(lastRate || 0, rateUnit, product);
          amount = round(nQty * nRate);
        } catch (e) {}

        const newRow = {
          id: "row-" + Date.now() + Math.random(),
          productId: product.id.toString(),
          weight: "1",
          unit,
          rate: lastRate.toString(),
          rateUnit,
          amount
        };

        const blankRow = {
          id: "row-" + Date.now() + Math.random(),
          productId: "",
          weight: "",
          unit: "KG",
          rate: "",
          rateUnit: "KG",
          amount: 0
        };

        // If the only row is empty and unselected, replace it
        if (prev.length === 1 && !prev[0].productId) {
          toast.success(`Added ${product.name} to cart.`);
          return [newRow, blankRow];
        }

        toast.success(`Added ${product.name} to cart.`);
        const lastRowEmpty = prev.length > 0 && !prev[prev.length - 1].productId;
        if (lastRowEmpty) {
          const updated = [...prev];
          updated[updated.length - 1] = newRow;
          return [...updated, blankRow];
        }
        return [...prev, newRow, blankRow];
      }
    });

    setScannerQuery("");
    setScannerResults([]);
  };

  const handleSelectSearchResult = (product) => {
    addOrIncrementProduct(product);
  };

  // Keyboard navigation within scanner search results overlay
  const handleScannerResultsKeyDown = (e) => {
    if (scannerResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setScannerIndex(prev => (prev + 1) % scannerResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setScannerIndex(prev => (prev - 1 + scannerResults.length) % scannerResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelectSearchResult(scannerResults[scannerIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setScannerResults([]);
    }
  };

  // 7. Keyboard Shortcuts (Global Hook)
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      const target = e.target;
      const isInputFocused = target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA";

      if (e.key === "F2") {
        e.preventDefault();
        scannerInputRef.current?.focus();
        scannerInputRef.current?.select();
      } else if (e.key === "F3") {
        e.preventDefault();
        cashCalculatorRef.current?.focus();
        cashCalculatorRef.current?.select();
      } else if (e.key === "F4") {
        e.preventDefault();
        // Focus product table cell
        const cell = document.getElementById("cell-0-productId");
        if (cell) {
          cell.focus();
          setFocusedRowIndex(0);
        }
      } else if (e.key === "F5" || (e.altKey && e.key.toLowerCase() === "c")) {
        e.preventDefault();
        const buyerBtn = document.getElementById("pos-buyer-select");
        if (buyerBtn) {
          buyerBtn.focus();
          buyerBtn.click();
        }
      } else if (e.key === "Escape") {
        // If results dropdown is open, close it
        if (scannerResults.length > 0) {
          e.preventDefault();
          setScannerResults([]);
        } else if (items.length > 0 && items[0].productId) {
          e.preventDefault();
          if (confirm("Are you sure you want to clear current sales cart?")) {
            handleReset();
          }
        }
      } else if (e.key === "F7" || (e.ctrlKey && e.key.toLowerCase() === "p") || (e.altKey && e.key.toLowerCase() === "p")) {
        // F7, Ctrl+P, Alt+P -> Save & Print & New
        e.preventDefault();
        handleSave(true, true);
      } else if (e.ctrlKey && e.key === "Enter") {
        // Ctrl+Enter -> Save & Close
        e.preventDefault();
        handleSave(false, false);
      } else if (e.ctrlKey && e.key === " ") {
        // Ctrl+Space -> Save & New Quick Checkout
        e.preventDefault();
        handleSave(true, false);
      } else if (e.altKey && e.key.toLowerCase() === "s") {
        // Alt+S -> Save & Close
        e.preventDefault();
        handleSave(false, false);
      } else if (e.altKey && e.key.toLowerCase() === "n") {
        // Alt+N -> Save & New Quick Checkout
        e.preventDefault();
        handleSave(true, false);
      }
    };

    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [items, scannerResults, handleReset, printConfig]);

  // 8. Save Flow Implementation
  const handleSave = async (quickCheckout = false, shouldPrint = false) => {
    if (isSubmitting) return;

    if (!buyerId) {
      toast.error("Please select a buyer.");
      return;
    }

    const filteredItems = items.filter(i => i.productId && i.weight && i.rate);
    if (filteredItems.length === 0) {
      toast.error("Please add at least one complete product row (product, quantity, and rate).");
      return;
    }

    if (filteredItems.some(i => parseFloat(i.weight) <= 0 || parseFloat(i.rate) <= 0)) {
      toast.error("All product weight and rates must be positive numbers greater than zero.");
      return;
    }

    const salesMode = flags?.salesMode || "HYBRID";
    if (salesMode === "TRACKED" && filteredItems.some(i => !i.salesTrackId)) {
      const proceed = window.confirm(
        "TRACKED mode is enabled, but some items are not linked to any intake transaction. Do you wish to proceed and save this invoice anyway?"
      );
      if (!proceed) return;
    }

    setIsSubmitting(true);
    const savePromise = toast.loading("Saving sale invoice...");

    try {
      const payload = {
        partyId: buyerId === "new" ? "new" : parseInt(buyerId),
        entryDate: invoiceDate,
        notes,
        items: filteredItems.map(item => {
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
            salesTrackId: item.salesTrackId || null
          };
        }),
        adjustments,
        newPartyData: buyerId === "new" ? { ...newBuyerData, partyType: "BUYER" } : null
      };

      const result = await createSaleAction(payload);

      if (result.success) {
        toast.dismiss(savePromise);
        toast.success(quickCheckout ? "Sale invoice recorded! Ready for next transaction." : "Sale invoice recorded successfully!");

        // Write to fastEntryMemoryStore
        if (buyerId !== "new") {
          fastEntryMemoryStore.setLastValue("lastBuyer", buyerId, "sales");
        }
        const lastItem = filteredItems[filteredItems.length - 1];
        if (lastItem) {
          fastEntryMemoryStore.setLastValue("lastProduct", lastItem.productId, "sales");
          fastEntryMemoryStore.setLastValue("lastRate", lastItem.rate, "sales");
          fastEntryMemoryStore.setLastValue("lastUnit", lastItem.unit, "sales");
        }

        if (shouldPrint) {
          try {
            const getRes = await getSaleAction(result.data.id);
            if (getRes.success) {
              triggerPrint("sale", getRes.data, "en", printConfig);
            } else {
              toast.warning("Invoice saved, but could not load details for printing.");
            }
          } catch (printErr) {
            console.error("Print failed:", printErr);
            toast.error("Invoice saved, but printing failed.");
          }
        }

        if (quickCheckout) {
          // Reset cart & forms, keep buyer and date
          setItems([
            {
              id: "row-" + Date.now(),
              productId: "",
              weight: "",
              unit: "KG",
              rate: "",
              rateUnit: "KG",
              amount: 0
            }
          ]);
          setAdjustments([]);
          setCashReceived("");
          setNotes("");
          setScannerQuery("");
          setScannerResults([]);
          setFocusedRowIndex(0);
          
          // Re-focus scanner input for quick scan
          requestAnimationFrame(() => {
            scannerInputRef.current?.focus();
          });
        } else {
          // Close and redirect to detail page
          router.push(`/sales/${result.data.id}`);
        }
      } else {
        toast.dismiss(savePromise);
        toast.error("Failed to save invoice: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      toast.dismiss(savePromise);
      toast.error("An unexpected error occurred: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-3">
      {/* 1. Combined Header & Customer Metadata Card */}
      <div className="relative z-20 flex flex-col gap-2 bg-card border border-border/60 rounded-xl p-2 shadow-sm backdrop-blur-md shrink-0">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
          {/* Back button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => router.push("/sales")}
              className="rounded-lg p-1.5 hover:bg-accent border hover:border-muted-foreground/10 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Back to Invoices"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 flex-1 min-w-0">
            {/* Buyer Selection */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3 text-primary" />
                Customer / Buyer (F5)
              </label>
              <SearchableSelect
                id="pos-buyer-select"
                value={buyerId}
                onChange={(val) => {
                  setBuyerId(val);
                  setIsNewBuyer(val === "new");
                }}
                options={buyerOptions}
                placeholder="Select Buyer..."
                variant="compact"
              />
            </div>

            {/* Date Selection */}
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary" />
                Billing Date
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full bg-background border border-border hover:border-muted-foreground/30 focus:border-primary rounded-lg px-2.5 py-1 text-xs outline-none transition-colors"
              />
            </div>

            {/* Barcode Search / Scan field */}
            <div className="space-y-0.5 relative">
              <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Keyboard className="h-3 w-3 text-primary" />
                Scan Barcode / Search (F2)
              </label>
              <form onSubmit={handleScannerSearch} className="relative">
                <input
                  ref={scannerInputRef}
                  id="scannerInput"
                  type="text"
                  placeholder="Scan item or type name..."
                  value={scannerQuery}
                  onChange={(e) => setScannerQuery(e.target.value)}
                  onKeyDown={handleScannerResultsKeyDown}
                  className={`w-full bg-background border rounded-lg pl-8 pr-2.5 py-1 text-xs outline-none transition-all font-medium focus:ring-2 focus:ring-primary/10 ${
                    flashError 
                      ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/10" 
                      : "border-border hover:border-muted-foreground/30 focus:border-primary"
                  }`}
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </form>

              {/* Autocomplete Dropdown Search Overlay */}
              {scannerResults.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border shadow-xl rounded-xl p-2 max-h-48 overflow-y-auto space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-bold text-muted-foreground px-2 py-1 border-b mb-1 uppercase tracking-wider">
                    Multiple matches found. Arrow keys & Enter:
                  </div>
                  {scannerResults.map((p, idx) => {
                    const active = idx === scannerIndex;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectSearchResult(p)}
                        onMouseEnter={() => setScannerIndex(idx)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-all ${
                          active 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <span>{p.name}</span>
                        <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                          active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          ID: {p.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Toolbar Actions */}
          <div className="flex items-center gap-1.5 shrink-0 self-end xl:self-center">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 bg-muted text-foreground border rounded-lg hover:bg-accent transition-all cursor-pointer"
              title="Clear Cart (Esc)"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true, false)}
              className="flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 bg-primary/10 hover:bg-primary/25 border border-primary/25 text-primary rounded-lg transition-all cursor-pointer"
              title="Quick Checkout (Ctrl+Space)"
            >
              Checkout & New
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true, true)}
              className="flex items-center justify-center gap-1 text-[11px] font-bold px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/25 border border-emerald-600/25 text-emerald-500 rounded-lg transition-all cursor-pointer"
              title="Save & Print Receipt (F7 / Ctrl+P)"
            >
              <Printer className="h-3 w-3" />
              Save & Print
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(false, false)}
              className="flex items-center justify-center gap-1 text-[11px] font-bold px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/95 transition-all shadow-md shadow-primary/10 cursor-pointer"
              title="Save & Close Invoice (Ctrl+Enter)"
            >
              <Save className="h-3 w-3" />
              Save Bill
            </button>
          </div>
        </div>

        {/* Inline Quick Add Buyer Details */}
        {isNewBuyer && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-3 duration-250 shrink-0">
            <div className="flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase tracking-wider">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              New Buyer Quick Master Setup
            </div>
            <div className="grid gap-2 grid-cols-1 md:grid-cols-3">
              <div className="space-y-0.5">
                <label className="text-[9px] font-bold uppercase text-muted-foreground">Buyer Name</label>
                <input
                  required
                  value={newBuyerData.name}
                  onChange={(e) => setNewBuyerData({ ...newBuyerData, name: e.target.value })}
                  placeholder="e.g. Imran Traders"
                  className="w-full bg-background border rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[9px] font-bold uppercase text-muted-foreground">Phone Number</label>
                <input
                  required
                  value={newBuyerData.phoneNumber}
                  onChange={(e) => setNewBuyerData({ ...newBuyerData, phoneNumber: e.target.value })}
                  placeholder="e.g. 03001234567"
                  className="w-full bg-background border rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-0.5">
                <label className="text-[9px] font-bold uppercase text-muted-foreground">Address (Optional)</label>
                <input
                  value={newBuyerData.address}
                  onChange={(e) => setNewBuyerData({ ...newBuyerData, address: e.target.value })}
                  placeholder="Market name, City"
                  className="w-full bg-background border rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Draft Suggestion Alert Banner */}
      {buyerId && buyerId !== "new" && (
        <div className="space-y-2">
          {loadingDraftSuggestion ? (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
              <span className="animate-spin h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full shrink-0" />
              <span>Searching for intelligent suggestions...</span>
            </div>
          ) : (
            <DraftSuggestionCard
              draftSuggestion={draftSuggestion}
              onApply={handleApplyPrefill}
              isCompact={true}
              buttonText="Use Draft"
            />
          )}
        </div>
      )}

      {/* 3. Core POS Table Spreadsheet */}
      <div className="flex-1 min-h-0 flex flex-col">
        <PosProductTable
          items={items}
          products={products}
          onChangeItem={handleChangeItem}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          focusedRowIndex={focusedRowIndex}
          setFocusedRowIndex={setFocusedRowIndex}
        />
      </div>

      {/* 4. Bottom Totals and Cash Calculator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="md:col-span-2">
          <PosTotals
            totals={totals}
            adjustments={adjustments}
            onAddAdjustment={handleAddAdjustment}
            onRemoveAdjustment={handleRemoveAdjustment}
            onEditAdjustmentValue={handleEditAdjustmentValue}
            adjustmentDefinitions={adjustmentDefinitions}
            notes={notes}
            onChangeNotes={setNotes}
          />
        </div>
        <div className="md:col-span-1">
          <PosCashCalculator
            finalAmount={totals.finalAmount}
            cashReceived={cashReceived}
            onChangeCashReceived={setCashReceived}
            calculatorRef={cashCalculatorRef}
          />
        </div>
      </div>
    </div>
  );
}
