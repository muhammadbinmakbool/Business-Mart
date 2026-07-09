"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { createIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { showToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Truck, Package, ArrowRight, User, Scale, DollarSign } from "lucide-react";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { getErrorPresentation } from "@/lib/errors/errorPresentation";
import { getLocalDateString } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { useKeyboardFlow } from "@/hooks/useKeyboardFlow";
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { getProductValidationState } from "@/modules/products/utils/productValidation";
import { getProductForIntake } from "@/modules/products/services/ProductInteractionService";
import { fastEntryMemoryStore } from "@/lib/fastEntryMemoryStore";

const INTAKE_FIELDS = [
  { name: "partyId", next: "productId", prev: null },
  { name: "productId", next: "unit", prev: "partyId" },
  { name: "unit", next: "grossWeight", prev: "productId" },
  { name: "grossWeight", next: "containerType", prev: "unit" },
  { name: "containerType", next: "containerCount", prev: "grossWeight" },
  { name: "containerCount", next: "transportType", prev: "containerType" },
  { name: "transportType", next: "transportIdentifier", prev: "containerCount" },
  { name: "transportIdentifier", next: "deliveredBy", prev: "transportType" },
  { name: "deliveredBy", next: "entryDate", prev: "transportIdentifier" },
  { name: "entryDate", next: "notes", prev: "deliveredBy" },
  { name: "notes", next: null, prev: "entryDate" },
];

export default function ReceiptIntakeForm({ suppliers, products, settings, backUrl, featureFlags }) {
  const router = useRouter();
  const formRef = useRef(null);
  const supplierRef = useRef(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSupplierState, setSelectedSupplierState] = useState("");
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "", type: "error" });
  const [unitRegistry, setUnitRegistry] = useState(null);

  // Core Weighment States
  const [selectedUnit, setSelectedUnit] = useState("KG");
  const [grossWeightVal, setGrossWeightVal] = useState("");
  const [useHelper, setUseHelper] = useState(false);
  const [helperQuantity, setHelperQuantity] = useState("");
  const [helperSizePerUnit, setHelperSizePerUnit] = useState("");
  const [helperUnitLabel, setHelperUnitLabel] = useState("Bag");

  // Arrival meta states
  const [containerType, setContainerType] = useState("Bag");
  const [containerCount, setContainerCount] = useState("");
  const [transportType, setTransportType] = useState("Tractor Trolley");
  const [transportIdentifier, setTransportIdentifier] = useState("");
  const [deliveredBy, setDeliveredBy] = useState("");

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
    };
  }), [products]);

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));
  const compatibleUnits = selectedProduct
    ? (unitRegistry
        ? Object.values(unitRegistry.units)
            .filter(u => u.unitCategoryCode === (selectedProduct.unitCategory || selectedProduct.category))
            .map(u => ({ id: u.code, name: u.name }))
        : [])
    : [];

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

  const handleProductChange = async (productId) => {
    if (productId) {
      const sessionMemory = {
        lastUnit: fastEntryMemoryStore.getLastValue("lastUnit", "intake"),
      };
      const result = await getProductForIntake(productId, sessionMemory);
      if (!result.success) {
        showToast.error(result.error);
        setSelectedProductId("");
        setSelectedUnit("KG");
        setGrossWeightVal("");
        return;
      }
      setSelectedProductId(productId);
      setSelectedUnit(result.defaults.unit);
    } else {
      setSelectedProductId("");
      setSelectedUnit("KG");
      setGrossWeightVal("");
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

  const handleKeyboardSubmit = useCallback(() => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    handleSubmit(formData, true);
  }, []);

  const { registerField } = useKeyboardFlow({
    fields: INTAKE_FIELDS,
    onSubmit: handleKeyboardSubmit,
    onCancel: () => router.push(backUrl || "/intake"),
    enableSmartDefaults: true,
  });

  async function handleSubmit(formData, shouldRedirect) {
    const grossWeightStr = formData.get("grossWeight");
    const grossWeight = grossWeightStr ? parseFloat(grossWeightStr) : 0;
    const advanceAmount = formData.get("advanceAmount");

    if ((grossWeightStr && grossWeight < 0) || (advanceAmount && parseFloat(advanceAmount) < 0)) {
      setErrorModal({
        isOpen: true,
        title: "Invalid Negative Parameters",
        message: "Weight and advance amount parameters must be positive numbers.",
        type: "error"
      });
      return;
    }

    const arrivalMeta = {
      containerType,
      containerCount: containerCount ? parseInt(containerCount) : null,
      transportType,
      transportIdentifier,
      deliveredBy
    };

    formData.set("arrivalMeta", JSON.stringify(arrivalMeta));

    const packagingMeta = useHelper && helperQuantity && helperSizePerUnit ? {
      type: helperUnitLabel || "Bag",
      count: parseFloat(helperQuantity),
      sizePerUnit: parseFloat(helperSizePerUnit),
      unitLabel: selectedUnit || "KG"
    } : null;
    formData.set("packagingMeta", packagingMeta ? JSON.stringify(packagingMeta) : "");

    let bagCount = "";
    if (useHelper && helperUnitLabel.toLowerCase() === "bag") {
      bagCount = helperQuantity;
    } else if (containerType.toLowerCase() === "bag" && containerCount) {
      bagCount = containerCount;
    }
    formData.set("bagCount", bagCount);

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

    showToast.success("Goods arrival registered successfully");

    // Save to memory store on successful save
    const savedPartyId = formData.get("partyId");
    const savedProductId = formData.get("productId");
    const savedUnit = formData.get("unit");
    if (savedPartyId) fastEntryMemoryStore.setLastValue("lastSupplier", savedPartyId, "intake");
    if (savedProductId) fastEntryMemoryStore.setLastValue("lastProduct", savedProductId, "intake");
    if (savedUnit) fastEntryMemoryStore.setLastValue("lastUnit", savedUnit, "intake");

    if (shouldRedirect) {
      router.push(`/intake/${result.id}`);
    } else {
      formRef.current?.reset();
      setSelectedProductId("");
      setSelectedSupplierState("");
      setGrossWeightVal("");
      setHelperQuantity("");
      setHelperSizePerUnit("");
      setContainerCount("");
      setTransportIdentifier("");
      setDeliveredBy("");
      setIsNewSupplier(false);
      requestAnimationFrame(() => {
        document.getElementById("partyId")?.focus();
      });
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
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
            <h1 className="text-2xl font-bold tracking-tight">Register Goods Arrival</h1>
            <p className="text-sm text-muted-foreground">Log incoming grain load and setup progressive intake workflow.</p>
          </div>
        </div>

        {/* Date Input */}
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-sm">
          <label htmlFor="entryDate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Arrival Date
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
          {/* Main Party & Product Section */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="partyId" className="text-sm font-medium">Supplier</label>
              <SearchableSelect
                ref={(el) => { if (supplierRef) supplierRef.current = el; registerField("partyId")(el); }}
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
            </div>

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
            </div>
          </div>

          {/* New Supplier Sub-Form */}
          {isNewSupplier && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
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

          {/* Weighment Section (Optional) */}
          <div className="border border-border bg-card/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3 mb-2">
              <Scale className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Initial Weighment (Optional)</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2 col-span-2">
                <label htmlFor="grossWeight" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gross Weight</label>
                <input
                  ref={registerField("grossWeight")}
                  id="grossWeight"
                  name="grossWeight"
                  type="number"
                  step="0.01"
                  placeholder="Leave empty if weight not yet recorded"
                  value={grossWeightVal}
                  onChange={(e) => setGrossWeightVal(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2 col-span-1">
                <label htmlFor="unit" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Unit</label>
                <select
                  ref={registerField("unit")}
                  id="unit"
                  name="unit"
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {compatibleUnits.length > 0 ? (
                    compatibleUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.id})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="KG">Kilogram (KG)</option>
                      <option value="MAUND">Maund (40 KG)</option>
                      <option value="BAG">Bag (Bora)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Packaging Helper Section */}
              <div className="md:col-span-3">
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
                </div>

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
          </div>

          {/* Transport & Container Details */}
          <div className="border border-border bg-card/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3 mb-2">
              <Truck className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Transport & Container Information</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="containerType" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Container Type</label>
                <select
                  ref={registerField("containerType")}
                  id="containerType"
                  value={containerType}
                  onChange={(e) => setContainerType(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Bag">Bag (Bora)</option>
                  <option value="Box">Box</option>
                  <option value="Crate">Crate</option>
                  <option value="None">Bulk/None</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="containerCount" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Container Count</label>
                <input
                  ref={registerField("containerCount")}
                  id="containerCount"
                  type="number"
                  placeholder="e.g. 150"
                  value={containerCount}
                  onChange={(e) => setContainerCount(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="transportType" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Transport Type</label>
                <select
                  ref={registerField("transportType")}
                  id="transportType"
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Tractor Trolley">Tractor Trolley</option>
                  <option value="Truck">Truck</option>
                  <option value="Cart">Rehri/Cart</option>
                  <option value="Hand Carry">Hand Carry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="transportIdentifier" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Vehicle Plate / ID</label>
                <input
                  ref={registerField("transportIdentifier")}
                  id="transportIdentifier"
                  type="text"
                  placeholder="e.g. LHR-4321"
                  value={transportIdentifier}
                  onChange={(e) => setTransportIdentifier(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-2">
                <label htmlFor="deliveredBy" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Driver / Bearer Name</label>
                <input
                  ref={registerField("deliveredBy")}
                  id="deliveredBy"
                  type="text"
                  placeholder="e.g. Muhammad Jameel"
                  value={deliveredBy}
                  onChange={(e) => setDeliveredBy(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Advance Payment Section (Optional) */}
          <div className="border border-border bg-card/50 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b pb-3 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">Advance Payment (Optional)</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="advanceAmount" className="text-sm font-medium">Amount Paid</label>
                <input
                  id="advanceAmount"
                  name="advanceAmount"
                  type="number"
                  placeholder="0.00"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground font-mono"
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

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">Arrival Notes / Remarks</label>
            <textarea
              ref={registerField("notes")}
              id="notes"
              name="notes"
              rows={2}
              placeholder="Any specific instructions, stack numbers, or initial conditions..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>

          {/* Form Actions */}
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
              Register & Add Another
            </button>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <span>Save & View Intake</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Error Modal */}
          <Modal
            isOpen={errorModal.isOpen}
            onClose={() => setErrorModal({ ...errorModal, isOpen: false })}
            title={errorModal.title}
            type={errorModal.type}
            confirmLabel="OK, Understood"
            onConfirm={() => setErrorModal({ ...errorModal, isOpen: false })}
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
