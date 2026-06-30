"use client";

import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";

import { createIntakeAction, getIntakeRateDefaultsAction } from "@/modules/intake/controllers/intakeActions";
import { showToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getUnitsByCategory, normalizeQuantity, normalizeRate, convertFromBase, convertRate, UNIT_IDS, DEFAULT_WEIGHT_UNIT } from "@/lib/units";
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { getProductValidationState } from "@/modules/products/utils/productValidation";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";

import { calculateTransactionTotals, round } from "@/lib/financial";
import TransactionHeader from "@/components/transaction/TransactionHeader";
import TransactionProductTable from "@/components/transaction/TransactionProductTable";
import TransactionTotals from "@/components/transaction/TransactionTotals";
import TransactionSettlement from "@/components/transaction/TransactionSettlement";
import { createPurchaseDocumentAction } from "@/modules/intake/controllers/intakeActions";
import { toast } from "sonner";

import { getErrorPresentation } from "@/lib/errors/errorPresentation";
import { getLocalDateString } from "@/lib/utils";
import { useKeyboardFlow } from "@/hooks/useKeyboardFlow";
import { fastEntryMemoryStore } from "@/lib/fastEntryMemoryStore";
import { useFastEntryAssistant } from "@/modules/fast-entry-assistant/hooks/useFastEntryAssistant";
import InlineSuggestionBox from "@/modules/fast-entry-assistant/components/InlineSuggestionBox";
import { getProductForIntake } from "@/modules/products/services/ProductInteractionService";

/** Merge multiple refs (ref objects + ref callbacks) onto one element. */
const mergeRefs = (...refs) => (el) => {
  refs.forEach((ref) => {
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  });
};

/** Static keyboard navigation order for the Intake form. */
const INTAKE_FIELDS = [
  { name: "partyId",     next: "productId",   prev: null },
  { name: "productId",   next: "unit",        prev: "partyId" },
  { name: "unit",        next: "grossWeight", prev: "productId" },
  { name: "grossWeight", next: "entryDate",   prev: "unit" },
  { name: "entryDate",   next: "notes",       prev: "grossWeight" },
  { name: "notes",       next: null,          prev: "entryDate" },
];

export default function IntakeForm({ suppliers, products, settings, backUrl, featureFlags, adjustmentDefinitions = [] }) {
  const router = useRouter();
  const formRef = useRef(null);
  const supplierRef = useRef(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [grossWeightVal, setGrossWeightVal] = useState("");

  const [useHelper, setUseHelper] = useState(false);
  const [helperQuantity, setHelperQuantity] = useState("");
  const [helperSizePerUnit, setHelperSizePerUnit] = useState("");
  const [helperUnitLabel, setHelperUnitLabel] = useState("Bag");

  const [saveAndContinue, setSaveAndContinue] = useState(false);
  const [selectedSupplierState, setSelectedSupplierState] = useState("");
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "", type: "error" });
  const [unitRegistry, setUnitRegistry] = useState(null);

  // ── Purchase Mode States ──
  const [purchaseItems, setPurchaseItems] = useState([
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
  ]);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState("");
  const [purchaseInvoiceDate, setPurchaseInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [isNewPurchaseSupplier, setIsNewPurchaseSupplier] = useState(false);
  const [newPurchaseSupplierData, setNewPurchaseSupplierData] = useState({ name: "", phoneNumber: "", address: "", notes: "" });
  const [purchaseAdjustments, setPurchaseAdjustments] = useState(() => {
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
  const [amountPaid, setAmountPaid] = useState("");
  const [isPurchaseSubmitting, setIsPurchaseSubmitting] = useState(false);
  const [focusedPurchaseRowIndex, setFocusedPurchaseRowIndex] = useState(0);

  const defaultProductVal = settings?.defaults?.activeMarketProductId || settings?.defaults?.productId || "";

  const supplierOptions = React.useMemo(() => [
    { value: "new", label: "➕ Add New Supplier", specialOption: true },
    ...suppliers.map(s => ({
      value: s.id.toString(),
      label: s.name,
      subLabel: s.phoneNumber
    }))
  ], [suppliers]);

  const productOptions = React.useMemo(() => products.map(p => {
    const validation = getProductValidationState(p);
    return {
      value: p.id.toString(),
      label: validation.isValid ? p.name : `${p.name} (⚠️ Misconfigured)`,
      subLabel: validation.isValid ? undefined : "Invalid configuration"
    };
  }), [products]);

  // ── Keyboard Flow Integration ──
  const handleKeyboardSubmit = useCallback(() => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    handleSubmit(formData, !saveAndContinue);
  }, [saveAndContinue]);

  const { registerField } = useKeyboardFlow({
    fields: INTAKE_FIELDS,
    onSubmit: handleKeyboardSubmit,
    onCancel: () => router.push(backUrl || "/intake"),
    enableSmartDefaults: true,
  });

  const assistantSuggestions = useFastEntryAssistant({
    context: "intake",
    partyId: selectedSupplierState,
    productId: selectedProductId
  });

  useEffect(() => {
    async function loadData() {
      const res = await getUnitRegistryAction();
      if (res.success) {
        setUnitRegistry(res.data);
      }
      if (defaultProductVal) {
        const defaultProductStr = defaultProductVal.toString();
        const prodExists = products.some(p => p.id === parseInt(defaultProductStr));
        if (prodExists) {
          handleProductChange(defaultProductStr);
        }
      }
    }
    loadData();
  }, []);

  const applySupplierSuggestion = () => {
    if (supplierRef.current && !selectedSupplierState && assistantSuggestions.party) {
      supplierRef.current.value = assistantSuggestions.party;
      setSelectedSupplierState(assistantSuggestions.party);
      setIsNewSupplier(assistantSuggestions.party === "new");
    }
  };

  const applyProductSuggestion = () => {
    if (!selectedProductId && assistantSuggestions.product) {
      handleProductChange(assistantSuggestions.product);
    }
  };

  const applyUnitSuggestion = () => {
    if (!selectedUnit && assistantSuggestions.unit) {
      handleUnitChange(assistantSuggestions.unit);
    }
  };

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));
  const compatibleUnits = selectedProduct
    ? (unitRegistry
        ? Object.values(unitRegistry.units).filter(u => u.unitCategoryCode === (selectedProduct.unitCategory || selectedProduct.category)).map(u => ({ id: u.code, name: u.name }))
        : getUnitsByCategory(selectedProduct.category))
    : [];

  const suggestedSupplier = suppliers.find(s => s.id.toString() === assistantSuggestions.party);
  const suggestedProduct = products.find(p => p.id.toString() === assistantSuggestions.product);
  const suggestedUnit = selectedProduct
    ? compatibleUnits.find(u => u.id === assistantSuggestions.unit)
    : null;

  const handleProductChange = async (productId) => {
    if (productId) {
      const sessionMemory = {
        lastUnit: fastEntryMemoryStore.getLastValue("lastUnit", "intake"),
      };
      const result = await getProductForIntake(productId, sessionMemory);
      if (!result.success) {
        showToast.error(result.error);
        setSelectedProductId("");
        setSelectedUnit(null);
        setGrossWeightVal("");
        return;
      }
      setSelectedProductId(productId);
      setSelectedUnit(result.defaults.unit);
    } else {
      setSelectedProductId("");
      setSelectedUnit(null);
      setGrossWeightVal("");
    }
  };

  const handleGrossWeightChange = (val) => {
    setGrossWeightVal(val);
  };

  const handleUnitChange = (unit) => {
    setSelectedUnit(unit);
  };

  // ── Purchase Mode Handlers ──
  const purchaseTotals = useMemo(() => {
    const processedItems = purchaseItems.map(item => {
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

    return calculateTransactionTotals(processedItems, purchaseAdjustments);
  }, [purchaseItems, purchaseAdjustments, products, unitRegistry]);

  const handleResetPurchase = () => {
    setPurchaseItems([
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
    setAmountPaid("");
    setPurchaseNotes("");
    setIsNewPurchaseSupplier(false);
    setNewPurchaseSupplierData({ name: "", phoneNumber: "", address: "", notes: "" });
    setFocusedPurchaseRowIndex(0);
    toast.info("Cart cleared.");
  };

  const handleAddPurchaseItem = () => {
    setPurchaseItems(prev => [
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
  };

  const handleRemovePurchaseItem = (index) => {
    setPurchaseItems(prev => {
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
  };

  const handleChangePurchaseItem = async (index, field, value) => {
    if (field === "productId" && value) {
      const sessionMemory = {
        lastUnit: fastEntryMemoryStore.getLastValue("lastUnit", "intake"),
      };
      const result = await getProductForIntake(value, sessionMemory);

      setPurchaseItems(prev => {
        const newItems = [...prev];
        newItems[index] = { ...newItems[index], [field]: value };

        if (result.success) {
          const { defaults } = result;
          newItems[index].unit = defaults.unit;
          newItems[index].rateUnit = defaults.unit;
          
          if (defaults.buyingRate) {
            newItems[index].rate = defaults.buyingRate.toString();
          } else if (defaults.rate) {
            newItems[index].rate = defaults.rate.toString();
          }
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
      setPurchaseItems(prev => {
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
  };

  const handleSavePurchase = async () => {
    if (!purchaseSupplierId) {
      toast.error("Please select a supplier first.");
      return;
    }
    const validItems = purchaseItems.filter(item => item.productId && item.weight && item.rate);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid item with product, weight, and rate.");
      return;
    }

    setIsPurchaseSubmitting(true);
    try {
      const payload = {
        partyId: purchaseSupplierId === "new" ? "new" : parseInt(purchaseSupplierId),
        entryDate: purchaseInvoiceDate,
        items: validItems.map(item => {
          const packagingMeta = item.useHelper && item.helperQuantity && item.helperSizePerUnit ? {
            type: item.helperUnitLabel || "Bag",
            count: parseFloat(item.helperQuantity),
            sizePerUnit: parseFloat(item.helperSizePerUnit),
            unitLabel: item.unit || "KG"
          } : null;
          return {
            productId: parseInt(item.productId),
            grossWeight: parseFloat(item.weight),
            netWeight: parseFloat(item.weight),
            unit: item.unit,
            rate: parseFloat(item.rate),
            rateUnit: item.rateUnit,
            bagCount: item.useHelper && item.helperUnitLabel.toLowerCase() === "bag" ? parseFloat(item.helperQuantity) : 0,
            packagingMeta: packagingMeta,
            notes: purchaseNotes
          };
        }),
        adjustments: purchaseAdjustments,
        amountPaid: parseFloat(amountPaid) || 0,
        paymentMethod: "CASH",
        notes: purchaseNotes
      };

      if (purchaseSupplierId === "new") {
        payload.newPartyData = {
          name: newPurchaseSupplierData.name,
          phoneNumber: newPurchaseSupplierData.phoneNumber,
          address: newPurchaseSupplierData.address,
          notes: newPurchaseSupplierData.notes,
          partyType: "SUPPLIER"
        };
      }

      const res = await createPurchaseDocumentAction(payload);
      if (res.success) {
        toast.success("Purchase recorded successfully.");
        router.push(backUrl || "/intake");
      } else {
        toast.error(res.error || "Failed to save purchase document.");
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || "An error occurred.");
    } finally {
      setIsPurchaseSubmitting(false);
    }
  };

  const handleHelperChange = (qty, size) => {
    setHelperQuantity(qty);
    setHelperSizePerUnit(size);
    if (qty && size) {
      const calculated = parseFloat(qty) * parseFloat(size);
      setGrossWeightVal(calculated.toString());
    } else {
      setGrossWeightVal("");
    }
  };

  async function handleSubmit(formData, shouldRedirect) {
    const grossWeight = parseFloat(formData.get("grossWeight"));
    const rate = formData.get("rate") ? parseFloat(formData.get("rate")) : null;

    if (grossWeight <= 0 || (rate !== null && rate <= 0)) {
      setErrorModal({
        isOpen: true,
        title: "Invalid Negative Parameters",
        message: "Weight, quantity, and rate parameters must be positive numbers greater than zero.",
        type: "error"
      });
      return;
    }

    const packagingMeta = useHelper && helperQuantity && helperSizePerUnit ? {
      type: helperUnitLabel || "Bag",
      count: parseFloat(helperQuantity),
      sizePerUnit: parseFloat(helperSizePerUnit),
      unitLabel: selectedUnit || "KG"
    } : null;
    formData.set("packagingMeta", packagingMeta ? JSON.stringify(packagingMeta) : "");
    if (useHelper && helperUnitLabel.toLowerCase() === "bag") {
      formData.set("bagCount", helperQuantity);
    } else {
      formData.set("bagCount", "");
    }

    const result = await createIntakeAction(formData);
    
    if (result?.error) {
      const presentation = getErrorPresentation(result);
      setErrorModal({
        isOpen: true,
        title: presentation.title,
        message: presentation.message,
        type: presentation.type
      });
      return;
    }

    showToast.success("Intake recorded successfully");
    
    // Save to memory store on successful save
    const savedPartyId = formData.get("partyId");
    const savedProductId = formData.get("productId");
    const savedUnit = formData.get("unit");
    if (savedPartyId) fastEntryMemoryStore.setLastValue("lastSupplier", savedPartyId, "intake");
    if (savedProductId) fastEntryMemoryStore.setLastValue("lastProduct", savedProductId, "intake");
    if (savedUnit) fastEntryMemoryStore.setLastValue("lastUnit", savedUnit, "intake");
    
    if (shouldRedirect) {
      router.push(backUrl || "/intake");
    } else {
      // Save & Continue: keep partyId + productId, clear the rest
      formRef.current?.reset();
      setGrossWeightVal("");
      setHelperQuantity("");
      setHelperSizePerUnit("");
      // Re-apply kept values after reset (reset clears uncontrolled fields)
      // partyId is uncontrolled — re-set via DOM
      const partySelect = document.getElementById("partyId");
      const keptPartyId = partySelect?.value;
      if (!saveAndContinue) {
        setSelectedProductId("");
        setSelectedUnit("");
      }
      setSelectedSupplierState("");
      setSelectedSupplierState("");
      // Restore partyId after reset
      if (keptPartyId && partySelect) {
        requestAnimationFrame(() => { 
          partySelect.value = keptPartyId; 
          if (saveAndContinue) {
            setSelectedSupplierState(keptPartyId);
          }
        });
      }
      // Focus: if continuing, jump to weight/bagCount; otherwise supplier
      const focusTarget = saveAndContinue ? "grossWeight" : "partyId";
      requestAnimationFrame(() => {
        document.getElementById(focusTarget)?.focus();
      });
    }
  }

  const isPurchaseMode = featureFlags?.intakeMode === "PURCHASE";

  if (isPurchaseMode) {
    return (
      <div className="flex flex-col h-[calc(100vh-5rem)] gap-4 select-none">
        {/* Header */}
        <TransactionHeader
          router={router}
          buyerId={purchaseSupplierId}
          setBuyerId={setPurchaseSupplierId}
          setIsNewBuyer={setIsNewPurchaseSupplier}
          buyerOptions={supplierOptions.map(opt => ({
            ...opt,
            label: opt.value === "new" ? "➕ Add New Supplier" : opt.label
          }))}
          invoiceDate={purchaseInvoiceDate}
          setInvoiceDate={setPurchaseInvoiceDate}
          handleReset={handleResetPurchase}
          isSubmitting={isPurchaseSubmitting}
          handleSave={handleSavePurchase}
          isNewBuyer={isNewPurchaseSupplier}
          newBuyerData={newPurchaseSupplierData}
          setNewBuyerData={setNewPurchaseSupplierData}
          showScanner={false}
          showCheckoutNew={false}
          showPrint={false}
          partyLabel="Supplier"
          dateLabel="Entry Date"
          partyPlaceholder="Select Supplier..."
          newPartySectionTitle="New Supplier Quick Master Setup"
          partyNameLabel="Supplier Name"
          saveLabel="Complete Purchase"
          backUrl={backUrl || "/intake"}
        />

        {/* Table */}
        <div className="flex-1 min-h-0 flex flex-col">
          <TransactionProductTable
            items={purchaseItems}
            products={products}
            onChangeItem={handleChangePurchaseItem}
            onAddItem={handleAddPurchaseItem}
            onRemoveItem={handleRemovePurchaseItem}
            focusedRowIndex={focusedPurchaseRowIndex}
            setFocusedRowIndex={setFocusedPurchaseRowIndex}
            unitRegistry={unitRegistry}
          />
        </div>

        {/* Totals & Settlement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="md:col-span-2">
            <TransactionTotals
              totals={purchaseTotals}
              adjustments={purchaseAdjustments}
              onAddAdjustment={(adj) => setPurchaseAdjustments(prev => [...prev, adj])}
              onRemoveAdjustment={(idx) => setPurchaseAdjustments(prev => prev.filter((_, i) => i !== idx))}
              onEditAdjustmentValue={(idx, val) => setPurchaseAdjustments(prev => {
                const copy = [...prev];
                copy[idx].value = val;
                return copy;
              })}
              adjustmentDefinitions={adjustmentDefinitions}
              notes={purchaseNotes}
              onChangeNotes={setPurchaseNotes}
            />
          </div>
          <div className="md:col-span-1">
            <TransactionSettlement
              finalAmount={purchaseTotals.finalAmount}
              cashReceived={amountPaid}
              onChangeCashReceived={setAmountPaid}
              layout="settlement"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={backUrl || "/intake"}
            className="rounded-full p-2 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Record Goods Intake</h1>
            <p className="text-sm text-muted-foreground">Log new arrival of goods from a supplier.</p>
          </div>
        </div>

        {/* Date Input at the top-right */}
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-sm">
          <label htmlFor="entryDate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Entry Date
          </label>
          <input
            ref={registerField("entryDate")}
            id="entryDate"
            name="entryDate"
            type="date"
            required
            defaultValue={getLocalDateString()}
            form="intake-form"
            className="bg-transparent border-0 text-sm focus:outline-none focus:ring-0 outline-none font-mono w-36 text-foreground"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form 
          id="intake-form"
          ref={formRef}
          action={(formData) => handleSubmit(formData, true)} 
          className="space-y-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
        {/* 1. Supplier */}
        <div className="space-y-2">
          <label htmlFor="partyId" className="text-sm font-medium">Supplier</label>
          <SearchableSelect
            ref={mergeRefs(supplierRef, registerField("partyId"))}
            id="partyId"
            name="partyId"
            required
            autoFocus
            value={selectedSupplierState}
            onChange={(val) => {
              setIsNewSupplier(val === "new");
              setSelectedSupplierState(val);
            }}
            options={supplierOptions}
            placeholder="Select a supplier..."
          />
          <InlineSuggestionBox 
            suggestion={assistantSuggestions.party}
            label={suggestedSupplier?.name}
            onApply={applySupplierSuggestion}
            currentValue={selectedSupplierState}
          />
        </div>

        {/* ... (New Supplier Fields remain unchanged) ... */}
        {isNewSupplier && (
          <div className="md:col-span-2 bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">New Supplier Details</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="newName" className="text-xs font-bold uppercase text-muted-foreground">Supplier Name</label>
                <input
                  id="newName"
                  name="newName"
                  required={isNewSupplier}
                  placeholder="e.g. Haji Ahmad"
                  className="w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="newPhone" className="text-xs font-bold uppercase text-muted-foreground">Phone Number</label>
                <input
                  id="newPhone"
                  name="newPhone"
                  required={isNewSupplier}
                  placeholder="e.g. 03001234567"
                  className="w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="newAddress" className="text-xs font-bold uppercase text-muted-foreground">Address (Optional)</label>
                <input
                  id="newAddress"
                  name="newAddress"
                  placeholder="Street, City, etc."
                  className="w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="newPartyNotes" className="text-xs font-bold uppercase text-muted-foreground">Supplier Notes (Optional)</label>
                <textarea
                  id="newPartyNotes"
                  name="newPartyNotes"
                  rows={2}
                  placeholder="Special instructions about this supplier..."
                  className="w-full rounded-md border border-primary/20 bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Product */}
        <div className="space-y-2">
          <label htmlFor="productId" className="text-sm font-medium">Product</label>
          <SearchableSelect
            ref={registerField("productId")}
            id="productId"
            name="productId"
            required
            value={selectedProductId}
            onChange={handleProductChange}
            options={productOptions}
            placeholder="Select a product..."
          />
          <InlineSuggestionBox 
            suggestion={assistantSuggestions.product}
            label={suggestedProduct?.name}
            onApply={applyProductSuggestion}
            currentValue={selectedProductId}
          />
        </div>         {/* 3. Unit Selection */}
        <div className="space-y-2">
          <label htmlFor="unit" className="text-sm font-medium">Measurement Unit</label>
          <select
            ref={registerField("unit")}
            id="unit"
            name="unit"
            required
            disabled={!selectedProductId}
            value={selectedUnit || ""}
            onChange={(e) => handleUnitChange(e.target.value || null)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 font-medium"
          >
            {compatibleUnits.length === 0 ? (
              <option value="">--</option>
            ) : (
              compatibleUnits.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
              ))
            )}
            {!selectedProductId && <option value="">Select a product first...</option>}
          </select>
          <InlineSuggestionBox 
            suggestion={assistantSuggestions.unit}
            label={suggestedUnit?.name || assistantSuggestions.unit}
            onApply={applyUnitSuggestion}
            currentValue={selectedUnit}
          />
        </div>

        {/* 4. Weight */}
        <div className="space-y-2">
          <label htmlFor="grossWeight" className="text-sm font-medium">
            Gross Quantity
          </label>
          <input
            ref={registerField("grossWeight")}
            id="grossWeight"
            name="grossWeight"
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={grossWeightVal}
            onChange={(e) => handleGrossWeightChange(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono placeholder:text-muted-foreground"
          />
        </div>

        {/* Packaging Helper Section */}
        <div className="md:col-span-2">
          {/* Packaging Helper Toggle */}
          <div className="flex items-center gap-2 py-1">
            <input
              id="useHelper"
              type="checkbox"
              checked={useHelper}
              onChange={(e) => {
                setUseHelper(e.target.checked);
                if (!e.target.checked) {
                  setHelperQuantity("");
                  setHelperSizePerUnit("");
                }
              }}
              className="rounded border-primary text-primary focus:ring-primary h-4 w-4 cursor-pointer"
            />
            <label htmlFor="useHelper" className="text-xs font-bold uppercase tracking-wider text-muted-foreground select-none cursor-pointer hover:text-foreground transition-colors">
              Use Packaging Helper
            </label>
            {useHelper && (
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ml-2">
                Helper Active
              </span>
            )}
          </div>

          {/* Expanded Packaging Helper Section */}
          {useHelper && (
            <div className="mt-2 border border-border bg-card/40 rounded-lg p-4 grid gap-4 grid-cols-3 animate-in fade-in duration-200 shadow-sm">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Package Type</label>
                <input
                  type="text"
                  placeholder="e.g. Bag, Box, Crate"
                  value={helperUnitLabel}
                  onChange={(e) => setHelperUnitLabel(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quantity</label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={helperQuantity}
                  onChange={(e) => handleHelperChange(e.target.value, helperSizePerUnit)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Size per Unit</label>
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={helperSizePerUnit}
                  onChange={(e) => handleHelperChange(helperQuantity, e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}
        </div>
      </div>



      {/* ... (Rest of the form remains unchanged) ... */}
      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
        <textarea
          ref={registerField("notes")}
          id="notes"
          name="notes"
          rows={2}
          placeholder="Truck number, location, etc."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
        />
      </div>

      <div className="bg-muted/30 rounded-lg p-4 space-y-4 border">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Advance Payment (Optional)</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="advanceAmount" className="text-sm font-medium">Amount Paid</label>
            <input
              id="advanceAmount"
              name="advanceAmount"
              type="number"
              placeholder="0.00"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="advanceNotes" className="text-sm font-medium">Advance Remarks</label>
            <input
              id="advanceNotes"
              name="advanceNotes"
              placeholder="e.g. Paid via Cash"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Save & Continue Toggle */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="saveAndContinue"
          checked={saveAndContinue}
          onChange={(e) => setSaveAndContinue(e.target.checked)}
          className="rounded border-primary text-primary focus:ring-primary/20"
        />
        <label htmlFor="saveAndContinue" className="text-xs font-semibold text-muted-foreground select-none">
          Save & Add Another (keeps Supplier + Product)
        </label>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
        <Link
          href={backUrl || "/intake"}
          className="px-6 py-2 text-sm text-center font-medium hover:bg-accent rounded-md transition-colors"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => {
            const formData = new FormData(formRef.current);
            handleSubmit(formData, false);
          }}
          className="border border-input bg-background hover:bg-accent hover:text-accent-foreground px-6 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Save & Add Another
        </button>
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Complete Intake
        </button>
        <p className="text-[10px] text-muted-foreground self-center font-mono">
          Ctrl+Enter to save
        </p>
      </div>
      
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
      </div>
    </div>
  );
}

