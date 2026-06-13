"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

import { createIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { showToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUnitsByCategory, normalizeQuantity, convertFromBase, UNIT_IDS, DEFAULT_WEIGHT_UNIT } from "@/lib/units";
import { getPreferredWeightUnit } from "@/lib/display-units";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { getErrorPresentation } from "@/lib/errors/errorPresentation";
import { getLocalDateString } from "@/lib/utils";
import { useKeyboardFlow } from "@/hooks/useKeyboardFlow";
import { fastEntryMemoryStore } from "@/lib/fastEntryMemoryStore";
import { useFastEntryAssistant } from "@/modules/fast-entry-assistant/hooks/useFastEntryAssistant";
import InlineSuggestionBox from "@/modules/fast-entry-assistant/components/InlineSuggestionBox";

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
  { name: "productId",   next: "bagCount",    prev: "partyId" },
  { name: "bagCount",    next: "grossWeight", prev: "productId" },
  { name: "grossWeight", next: "unit",        prev: "bagCount" },
  { name: "unit",        next: "entryDate",   prev: "grossWeight" },
  { name: "entryDate",   next: "notes",       prev: "unit" },
  { name: "notes",       next: null,          prev: "entryDate" },
];

export default function IntakeForm({ suppliers, products, settings, backUrl }) {
  const router = useRouter();
  const formRef = useRef(null);
  const supplierRef = useRef(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [grossWeightVal, setGrossWeightVal] = useState("");
  const [bagCountVal, setBagCountVal] = useState("");
  const [saveAndContinue, setSaveAndContinue] = useState(false);
  const [selectedSupplierState, setSelectedSupplierState] = useState("");
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "", type: "error" });

  const defaultProductVal = settings?.defaults?.activeMarketProductId || settings?.defaults?.productId || "";

  const supplierOptions = React.useMemo(() => [
    { value: "new", label: "➕ Add New Supplier", specialOption: true },
    ...suppliers.map(s => ({
      value: s.id.toString(),
      label: s.name,
      subLabel: s.phoneNumber
    }))
  ], [suppliers]);

  const productOptions = React.useMemo(() => products.map(p => ({
    value: p.id.toString(),
    label: p.name
  })), [products]);

  // ── Keyboard Flow Integration ──
  const handleKeyboardSubmit = useCallback(() => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    handleSubmit(formData, !saveAndContinue);
  }, [saveAndContinue]);

  const { registerField } = useKeyboardFlow({
    fields: INTAKE_FIELDS,
    onSubmit: handleKeyboardSubmit,
    enableSmartDefaults: true,
  });

  const assistantSuggestions = useFastEntryAssistant({
    context: "intake",
    partyId: selectedSupplierState,
    productId: selectedProductId
  });

  useEffect(() => {
    if (defaultProductVal) {
      const defaultProductStr = defaultProductVal.toString();
      const prodExists = products.some(p => p.id === parseInt(defaultProductStr));
      if (prodExists) {
        handleProductChange(defaultProductStr);
      }
    }
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
  const isBagProduct = selectedProduct && (selectedProduct.primaryUnit === "BAG" || selectedProduct.category === "BAG");
  const compatibleUnits = selectedProduct
    ? (isBagProduct
        ? getUnitsByCategory(selectedProduct.category).filter(u => u.id === "BAG")
        : getUnitsByCategory(selectedProduct.category))
    : [];

  const suggestedSupplier = suppliers.find(s => s.id.toString() === assistantSuggestions.party);
  const suggestedProduct = products.find(p => p.id.toString() === assistantSuggestions.product);
  const suggestedUnit = selectedProduct
    ? compatibleUnits.find(u => u.id === assistantSuggestions.unit)
    : null;

  const handleProductChange = (productId) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === parseInt(productId));
    if (prod) {
      const isProdBag = prod.primaryUnit === "BAG" || prod.category === "BAG";
      const units = getUnitsByCategory(prod.category);
      const prefUnit = getPreferredWeightUnit();
      const isPrefCompatible = units.some(u => u.id === prefUnit);
      const defaultUnit = isProdBag ? "BAG" : (isPrefCompatible ? prefUnit : (prod.primaryUnit || DEFAULT_WEIGHT_UNIT));
      setSelectedUnit(defaultUnit);

      if (defaultUnit === UNIT_IDS.BAG) {
        setGrossWeightVal(bagCountVal);
      } else if (isProdBag && grossWeightVal) {
        const weightInKg = normalizeQuantity(grossWeightVal, defaultUnit, prod);
        const bags = convertFromBase(weightInKg, UNIT_IDS.BAG, prod);
        const calculatedBags = Math.ceil(bags);
        setBagCountVal(calculatedBags ? calculatedBags.toString() : "");
      }
    } else {
      setSelectedUnit("");
      setGrossWeightVal("");
      setBagCountVal("");
    }
  };

  const handleGrossWeightChange = (val) => {
    setGrossWeightVal(val);
    if (isBagProduct && (selectedUnit === UNIT_IDS.KG || selectedUnit === UNIT_IDS.MAUND)) {
      const weightInKg = normalizeQuantity(val, selectedUnit, selectedProduct);
      const bags = convertFromBase(weightInKg, UNIT_IDS.BAG, selectedProduct);
      const calculatedBags = Math.ceil(bags);
      setBagCountVal(calculatedBags ? calculatedBags.toString() : "");
    }
  };

  const handleUnitChange = (unit) => {
    setSelectedUnit(unit);
    if (unit === UNIT_IDS.BAG) {
      setGrossWeightVal(bagCountVal);
    } else if (isBagProduct) {
      const weightInKg = normalizeQuantity(grossWeightVal, unit, selectedProduct);
      const bags = convertFromBase(weightInKg, UNIT_IDS.BAG, selectedProduct);
      const calculatedBags = Math.ceil(bags);
      setBagCountVal(calculatedBags ? calculatedBags.toString() : "");
    }
  };

  const handleBagCountChange = (val) => {
    setBagCountVal(val);
    if (selectedUnit === UNIT_IDS.BAG) {
      setGrossWeightVal(val);
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
      setBagCountVal("");
      // Re-apply kept values after reset (reset clears uncontrolled fields)
      // partyId is uncontrolled — re-set via DOM
      const partySelect = document.getElementById("partyId");
      const keptPartyId = partySelect?.value;
      // productId is controlled, so we keep it as-is unless user wants full clear
      if (!saveAndContinue) {
        setSelectedProductId("");
        setSelectedUnit("");
      }
      setSelectedSupplierState("");
      // Restore partyId after reset
      if (keptPartyId && partySelect) {
        requestAnimationFrame(() => { partySelect.value = keptPartyId; });
      }
      // Focus: if continuing, jump to weight/bagCount; otherwise supplier
      const focusTarget = saveAndContinue ? "grossWeight" : "partyId";
      requestAnimationFrame(() => {
        document.getElementById(focusTarget)?.focus();
      });
    }
  }

  return (
    <form 
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
            value={selectedUnit}
            onChange={(e) => handleUnitChange(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 font-medium"
          >
            {compatibleUnits.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
            ))}
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
            Gross Weight {selectedUnit === UNIT_IDS.BAG ? "(Calculated in KG)" : ""}
          </label>
          {selectedUnit === UNIT_IDS.BAG ? (
            <>
              <input
                id="grossWeight_display"
                type="text"
                readOnly
                value={selectedProduct ? normalizeQuantity(bagCountVal || 0, UNIT_IDS.BAG, selectedProduct).toFixed(2) : ""}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-muted cursor-not-allowed text-muted-foreground font-semibold"
              />
              <input
                type="hidden"
                name="grossWeight"
                value={grossWeightVal}
              />
            </>
          ) : (
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
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>

        {/* 5. Bag Count */}
        <div className="space-y-2">
          <label htmlFor="bagCount" className="text-sm font-medium">
            {selectedUnit === UNIT_IDS.BAG ? "Bag Count (Required)" : (isBagProduct ? "Bag Count (Calculated)" : "Bag Count (Optional)")}
          </label>
          <input
            ref={registerField("bagCount")}
            id="bagCount"
            name="bagCount"
            type="number"
            required={selectedUnit === UNIT_IDS.BAG}
            readOnly={selectedUnit !== UNIT_IDS.BAG && isBagProduct}
            placeholder={selectedUnit === UNIT_IDS.BAG ? "Enter number of bags..." : (isBagProduct ? "Automatically calculated" : "e.g. 50")}
            value={bagCountVal}
            onChange={(e) => handleBagCountChange(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${selectedUnit !== "BAG" && isBagProduct ? "bg-muted cursor-not-allowed text-muted-foreground" : "bg-background"}`}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="entryDate" className="text-sm font-medium">Entry Date</label>
          <input
            ref={registerField("entryDate")}
            id="entryDate"
            name="entryDate"
            type="date"
            required
            defaultValue={getLocalDateString()}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
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
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="advanceNotes" className="text-sm font-medium">Advance Remarks</label>
            <input
              id="advanceNotes"
              name="advanceNotes"
              placeholder="e.g. Paid via Cash"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
  );
}

