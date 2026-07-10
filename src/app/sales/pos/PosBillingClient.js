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
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { getBuyerDraftSuggestionAction } from "@/modules/sales-workbench/controllers/workbenchActions";
import DraftSuggestionCard from "@/components/sales/DraftSuggestionCard";
import { triggerPrint } from "@/print/utils/printUtils";
import { calculateTransactionTotals, round } from "@/lib/financial";
import { normalizeQuantity, normalizeRate, getUnitsByCategory } from "@/lib/units";
import { fastEntryMemoryStore } from "@/lib/fastEntryMemoryStore";
import { getProductForPOS } from "@/modules/products/services/ProductInteractionService";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { useSettings } from "@/components/layout/SettingsContext";

// Components
import TransactionHeader from "@/components/transaction/TransactionHeader";
import TransactionProductTable from "@/components/transaction/TransactionProductTable";
import TransactionTotals from "@/components/transaction/TransactionTotals";
import TransactionSettlement from "@/components/transaction/TransactionSettlement";

export default function PosBillingClient({ 
  buyers = [], 
  products = [], 
  adjustmentDefinitions = [], 
  printConfig = null,
  initialData = null,
  flags = null
}) {
  const { currencySymbol, decimalPlaces } = useSettings();
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
  const [unitRegistry, setUnitRegistry] = useState(null);

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
      return initialData.items.map((item, idx) => {
        const initialMeta = item.packagingMeta ? (typeof item.packagingMeta === 'string' ? JSON.parse(item.packagingMeta) : item.packagingMeta) : null;
        return {
          id: `row-${idx}`,
          productId: item.productId?.toString() || "",
          weight: item.weight?.toString() || "",
          unit: item.unit || "KG",
          rate: item.rate?.toString() || "",
          rateUnit: item.rateUnit || "KG",
          amount: item.amount || 0,
          salesTrackId: item.salesTrackId || null,
          intakeNumber: item.intakeNumber || null,
          useHelper: !!initialMeta,
          helperQuantity: initialMeta?.count || "",
          helperSizePerUnit: initialMeta?.sizePerUnit || "",
          helperUnitLabel: initialMeta?.type || "Bag"
        };
      });
    }
    return [
      {
        id: "row-0",
        productId: "",
        weight: "",
        unit: "KG",
        rate: "",
        rateUnit: "KG",
        amount: 0,
        useHelper: false,
        helperQuantity: "",
        helperSizePerUnit: "",
        helperUnitLabel: "Bag"
      }
    ];
  });

  // Client-side initialization after hydration is complete
  useEffect(() => {
    async function loadRegistry() {
      const res = await getUnitRegistryAction();
      if (res.success) {
        setUnitRegistry(res.data);
      }
    }
    loadRegistry();

    if (initialData) return; // Skip memory store recovery for prefilled data
    const last = fastEntryMemoryStore.getLastValue("lastBuyer", "sales");
    if (last && buyers.some(b => b.id.toString() === last.toString())) {
      setBuyerId(last.toString());
    }

    const lastUnit = fastEntryMemoryStore.getLastValue("lastUnit", "sales");
    const lastRateUnit = fastEntryMemoryStore.getLastValue("lastRateUnit", "sales");
    if (lastUnit || lastRateUnit) {
      setItems(prev => prev.map(item => {
        if (!item.productId) {
          return {
            ...item,
            unit: lastUnit || "KG",
            rateUnit: lastRateUnit || lastUnit || "KG",
            rate: ""
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
        value: d.defaultConfiguredValue !== null ? d.defaultConfiguredValue : "",
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
      if (!product) return { baseQuantity: 0, normalizedRate: 0 };
      try {
        const nWeight = normalizeQuantity(item.weight || 0, item.unit || "KG", product, unitRegistry);
        const nRate = normalizeRate(item.rate || 0, item.rateUnit || "KG", product, unitRegistry);
        return { baseQuantity: nWeight, normalizedRate: nRate, product };
      } catch (e) {
        return { baseQuantity: 0, normalizedRate: 0 };
      }
    });

    return calculateTransactionTotals(processedItems, adjustments);
  }, [items, adjustments, products, unitRegistry]);

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
        amount: 0,
        useHelper: false,
        helperQuantity: "",
        helperSizePerUnit: "",
        helperUnitLabel: "Bag"
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
        amount: 0,
        useHelper: false,
        helperQuantity: "",
        helperSizePerUnit: "",
        helperUnitLabel: "Bag"
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
          amount: 0,
          useHelper: false,
          helperQuantity: "",
          helperSizePerUnit: "",
          helperUnitLabel: "Bag"
        }];
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleChangeItem = useCallback(async (index, field, value) => {
    if (field === "productId" && value) {
      const sessionMemory = {
        lastUnit: fastEntryMemoryStore.getLastValue("lastUnit", "sales"),
        lastRateUnit: fastEntryMemoryStore.getLastValue("lastRateUnit", "sales"),
        lastRate: fastEntryMemoryStore.getLastValue("lastRate", "sales")
      };
      const result = await getProductForPOS(value, sessionMemory);

      setItems(prev => {
        const newItems = [...prev];
        newItems[index] = { ...newItems[index], [field]: value };

        if (result.success) {
          const { defaults } = result;
          newItems[index].unit = defaults.unit;
          newItems[index].rateUnit = defaults.rateUnit;
          newItems[index].rate = defaults.rate > 0 ? defaults.rate.toString() : "";
        }

        const existingItemWithSameProd = prev.find(item => item.productId === value && item.rate);
        if (existingItemWithSameProd) {
          newItems[index].rate = existingItemWithSameProd.rate;
          newItems[index].rateUnit = existingItemWithSameProd.rateUnit || newItems[index].unit;
        }

        if (index === prev.length - 1) {
          newItems.push({
            id: "row-" + Date.now() + Math.random(),
            productId: "",
            weight: "",
            unit: "KG",
            rate: "",
            rateUnit: "KG",
            amount: 0,
            useHelper: false,
            helperQuantity: "",
            helperSizePerUnit: "",
            helperUnitLabel: "Bag"
          });
        }

        if (newItems[index].useHelper) {
          const qty = parseFloat(newItems[index].helperQuantity) || 0;
          const size = parseFloat(newItems[index].helperSizePerUnit) || 0;
          if (qty && size) {
            newItems[index].weight = (qty * size).toString();
          } else {
            newItems[index].weight = "";
          }
        }

        const prod = products.find(p => p.id === parseInt(newItems[index].productId));
        if (prod) {
          try {
            const nQty = normalizeQuantity(newItems[index].weight || 0, newItems[index].unit || "KG", prod, unitRegistry);
            const nRate = normalizeRate(newItems[index].rate || 0, newItems[index].rateUnit || "KG", prod, unitRegistry);
            newItems[index].amount = round(nQty * nRate);
          } catch (e) {
            newItems[index].amount = 0;
          }
        } else {
          newItems[index].amount = 0;
        }

        return newItems;
      });
    } else {
      setItems(prev => {
        const newItems = [...prev];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === "useHelper" && !value) {
          newItems[index].helperQuantity = "";
          newItems[index].helperSizePerUnit = "";
        }

        if (newItems[index].useHelper) {
          const qty = parseFloat(newItems[index].helperQuantity) || 0;
          const size = parseFloat(newItems[index].helperSizePerUnit) || 0;
          if (qty && size) {
            newItems[index].weight = (qty * size).toString();
          } else {
            newItems[index].weight = "";
          }
        }

        if (field === "productId" && !value) {
          newItems[index].rate = "";
        }

        const prod = products.find(p => p.id === parseInt(newItems[index].productId));
        if (prod) {
          try {
            const nQty = normalizeQuantity(newItems[index].weight || 0, newItems[index].unit || "KG", prod, unitRegistry);
            const nRate = normalizeRate(newItems[index].rate || 0, newItems[index].rateUnit || "KG", prod, unitRegistry);
            newItems[index].amount = round(nQty * nRate);
          } catch (e) {
            newItems[index].amount = 0;
          }
        } else {
          newItems[index].amount = 0;
        }

        return newItems;
      });
    }
  }, [products, unitRegistry]);

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
          const nQty = normalizeQuantity(newWeight, newItems[existingIndex].unit, product, unitRegistry);
          const nRate = normalizeRate(newItems[existingIndex].rate || 0, newItems[existingIndex].rateUnit, product, unitRegistry);
          newItems[existingIndex].amount = round(nQty * nRate);
        } catch (e) {
          newItems[existingIndex].amount = 0;
        }

        toast.success(`Incremented quantity of ${product.name} to ${newWeight}.`);
        return newItems;
      } else {
        // Append new product row
        const isProdBag = unitRegistry
          ? unitRegistry.units[product.primaryUnit]?.isCustom === true
          : (product.primaryUnit === "BAG" || product.category === "BAG");
        const unit = isProdBag ? product.primaryUnit : "KG";
        const rateUnit = isProdBag ? product.primaryUnit : "KG";
        const lastRate = fastEntryMemoryStore.getLastValue("lastRate", "sales") || "";
        
        // Calculate amount
        let amount = 0;
        try {
          const nQty = normalizeQuantity(1, unit, product, unitRegistry);
          const nRate = normalizeRate(lastRate || 0, rateUnit, product, unitRegistry);
          amount = round(nQty * nRate);
        } catch (e) {}

        const newRow = {
          id: "row-" + Date.now() + Math.random(),
          productId: product.id.toString(),
          weight: "1",
          unit,
          rate: lastRate.toString(),
          rateUnit,
          amount,
          useHelper: false,
          helperQuantity: "",
          helperSizePerUnit: "",
          helperUnitLabel: "Bag"
        };

        const blankRow = {
          id: "row-" + Date.now() + Math.random(),
          productId: "",
          weight: "",
          unit: "KG",
          rate: "",
          rateUnit: "KG",
          amount: 0,
          useHelper: false,
          helperQuantity: "",
          helperSizePerUnit: "",
          helperUnitLabel: "Bag"
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
          const baseQuantity = product ? normalizeQuantity(item.weight || 0, item.unit || "KG", product) : 0;
          const amount = round(baseQuantity * normalizedRate);
          const packagingMeta = item.useHelper && item.helperQuantity && item.helperSizePerUnit ? {
            type: item.helperUnitLabel || "Bag",
            count: parseFloat(item.helperQuantity),
            sizePerUnit: parseFloat(item.helperSizePerUnit),
            unitLabel: item.unit || "KG"
          } : null;
          return {
            productId: parseInt(item.productId),
            weight: parseFloat(item.weight),
            unit: item.unit || "KG",
            rate: parseFloat(item.rate),
            rateUnit: item.rateUnit || "KG",
            baseQuantity,
            amount,
            salesTrackId: item.salesTrackId || null,
            packagingMeta
          };
        }),
        adjustments: adjustments.map(adj => ({
          ...adj,
          value: adj.value === "" ? 0 : Number(adj.value)
        })),
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
          fastEntryMemoryStore.setLastValue("lastRateUnit", lastItem.rateUnit, "sales");
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
              amount: 0,
              useHelper: false,
              helperQuantity: "",
              helperSizePerUnit: "",
              helperUnitLabel: "Bag"
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
    <div className="flex flex-col h-full min-h-0 gap-3">
      <TransactionHeader
        router={router}
        buyerId={buyerId}
        setBuyerId={setBuyerId}
        setIsNewBuyer={setIsNewBuyer}
        buyerOptions={buyerOptions}
        invoiceDate={invoiceDate}
        setInvoiceDate={setInvoiceDate}
        scannerInputRef={scannerInputRef}
        scannerQuery={scannerQuery}
        setScannerQuery={setScannerQuery}
        handleScannerSearch={handleScannerSearch}
        handleScannerResultsKeyDown={handleScannerResultsKeyDown}
        flashError={flashError}
        scannerResults={scannerResults}
        scannerIndex={scannerIndex}
        setScannerIndex={setScannerIndex}
        handleSelectSearchResult={handleSelectSearchResult}
        handleReset={handleReset}
        isSubmitting={isSubmitting}
        handleSave={handleSave}
        isNewBuyer={isNewBuyer}
        newBuyerData={newBuyerData}
        setNewBuyerData={setNewBuyerData}
        loadingDraftSuggestion={loadingDraftSuggestion}
        draftSuggestion={draftSuggestion}
        handleApplyPrefill={handleApplyPrefill}
      />

      {/* 3. Core POS Table Spreadsheet */}
      <div className="flex-1 min-h-0 flex flex-col">
        <TransactionProductTable
          items={items}
          products={products}
          onChangeItem={handleChangeItem}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          focusedRowIndex={focusedRowIndex}
          setFocusedRowIndex={setFocusedRowIndex}
          unitRegistry={unitRegistry}
          currencySymbol={currencySymbol}
          decimalPlaces={decimalPlaces}
        />
      </div>

      {/* 4. Bottom Totals and Cash Calculator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="md:col-span-2">
          <TransactionTotals
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
          <TransactionSettlement
            finalAmount={totals.finalAmount}
            cashReceived={cashReceived}
            onChangeCashReceived={setCashReceived}
            calculatorRef={cashCalculatorRef}
            layout="cash"
          />
        </div>
      </div>
    </div>
  );
}
