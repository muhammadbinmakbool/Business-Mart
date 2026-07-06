"use client";

import React, { useState, useEffect } from "react";
import { updateIntakeAction, getIntakeRateDefaultsAction } from "@/modules/intake/controllers/intakeActions";
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { showToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_WEIGHT_UNIT, getUnitsByCategory } from "@/lib/units";
import { DollarSign, ChevronLeft } from "lucide-react";
import { getProductValidationState } from "@/modules/products/utils/productValidation";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { getErrorPresentation } from "@/lib/errors/errorPresentation";
import { getLocalDateString } from "@/lib/utils";
import { getProductForIntake } from "@/modules/products/services/ProductInteractionService";

export default function PurchaseEditIntakeForm({ intake, suppliers, products, allowedActions = {}, featureFlags }) {
  const router = useRouter();

  // Controlled States
  const [selectedProductId, setSelectedProductId] = useState(intake.productId.toString());
  const [grossWeight, setGrossWeight] = useState(intake.grossWeight || "");
  const [unit, setUnit] = useState(intake.unit || DEFAULT_WEIGHT_UNIT);
  const [status, setStatus] = useState(intake.status || "PENDING");
  const [notes, setNotes] = useState(intake.notes || "");
  const [selectedSupplierState, setSelectedSupplierState] = useState(intake.partyId.toString());

  // Packaging helper UI states
  const initialMeta = intake.packagingMeta ? (typeof intake.packagingMeta === "string" ? JSON.parse(intake.packagingMeta) : intake.packagingMeta) : null;
  const [useHelper, setUseHelper] = useState(!!initialMeta);
  const [helperQuantity, setHelperQuantity] = useState(initialMeta?.count || "");
  const [helperSizePerUnit, setHelperSizePerUnit] = useState(initialMeta?.sizePerUnit || "");
  const [helperUnitLabel, setHelperUnitLabel] = useState(initialMeta?.type || "Bag");

  const supplierOptions = React.useMemo(() => suppliers.map(s => ({
    value: s.id.toString(),
    label: s.name,
    subLabel: s.phoneNumber
  })), [suppliers]);

  const productOptions = React.useMemo(() => products.map(p => {
    const validation = getProductValidationState(p);
    return {
      value: p.id.toString(),
      label: validation.isValid ? p.name : `${p.name} (⚠️ Misconfigured)`,
      subLabel: validation.isValid ? undefined : "Invalid configuration"
    };
  }), [products]);

  // Rate parameters
  const [rate, setRate] = useState(intake.rate || "");
  const [rateUnit, setRateUnit] = useState(intake.rateUnit || DEFAULT_WEIGHT_UNIT);
  
  // Rate Prefill states
  const [prefillReason, setPrefillReason] = useState("NONE");
  const [isRateDirty, setIsRateDirty] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    async function prefillRate() {
      setIsRateDirty(false);
      setPrefillReason("NONE");
      if (!selectedProductId) {
        setRate("");
        return;
      }
      const res = await getIntakeRateDefaultsAction(selectedProductId, selectedSupplierState);
      if (res?.success && res.data) {
        const { rate: pRate, rateUnit: pRateUnit, prefillReason: reason } = res.data;
        if (pRate !== null) {
          setRate(pRate.toString());
          setRateUnit(pRateUnit || "KG");
          setPrefillReason(reason);
        } else {
          setRate("");
          setRateUnit(pRateUnit || "KG");
          setPrefillReason("NONE");
        }
      } else {
        setRate("");
        setPrefillReason("NONE");
      }
    }

    prefillRate();
  }, [selectedProductId, selectedSupplierState]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "", type: "error" });
  const [unitRegistry, setUnitRegistry] = useState(null);

  useEffect(() => {
    async function loadRegistry() {
      const res = await getUnitRegistryAction();
      if (res.success) {
        setUnitRegistry(res.data);
      }
    }
    loadRegistry();
  }, []);

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));

  React.useEffect(() => {
    if (!intake.unit) {
      setUnit(selectedProduct?.primaryUnit || null);
    }
    if (!intake.rateUnit || intake.status === "PENDING") {
      setRateUnit(selectedProduct?.buyingRateUnit || null);
    }
  }, [intake, selectedProduct, unitRegistry]);

  const compatibleUnits = selectedProduct
    ? (unitRegistry
        ? Object.values(unitRegistry.units).filter(u => u.unitCategoryCode === (selectedProduct.unitCategory || selectedProduct.category)).map(u => ({ id: u.code, name: u.name }))
        : getUnitsByCategory(selectedProduct.category))
    : [];

  const handleProductChange = async (productId) => {
    if (productId) {
      const result = await getProductForIntake(productId, {});
      if (!result.success) {
        showToast.error(result.error);
        return;
      }
      setSelectedProductId(productId);
      setUnit(result.defaults.unit);
    } else {
      setSelectedProductId("");
      setUnit(null);
      setGrossWeight("");
    }
  };

  const handleGrossWeightChange = (val) => {
    setGrossWeight(val);
  };

  const handleUnitChange = (newUnit) => {
    setUnit(newUnit);
  };

  const handleHelperChange = (qty, size) => {
    setHelperQuantity(qty);
    setHelperSizePerUnit(size);
    if (qty && size) {
      const calculated = parseFloat(qty) * parseFloat(size);
      setGrossWeight(calculated.toString());
    } else {
      setGrossWeight("");
    }
  };

  const executeSubmit = async (formData) => {
    setIsSubmitting(true);
    formData.set("partyId", selectedSupplierState);
    formData.set("productId", selectedProductId);
    formData.set("unit", unit);
    formData.set("grossWeight", grossWeight);
    
    const packagingMeta = useHelper && helperQuantity && helperSizePerUnit ? {
      type: helperUnitLabel || "Bag",
      count: parseFloat(helperQuantity),
      sizePerUnit: parseFloat(helperSizePerUnit),
      unitLabel: unit || "KG"
    } : null;
    formData.set("packagingMeta", packagingMeta ? JSON.stringify(packagingMeta) : "");
    if (useHelper && helperUnitLabel.toLowerCase() === "bag") {
      formData.set("bagCount", helperQuantity);
    } else {
      formData.set("bagCount", "");
    }
    
    formData.set("status", status);
    formData.set("notes", notes);

    if (Number(grossWeight) <= 0) {
      setErrorModal({
        isOpen: true,
        title: "Invalid Weight Parameter",
        message: "Gross weight parameter must be a positive number greater than zero.",
        type: "error"
      });
      setIsSubmitting(false);
      return;
    }

    if (!rate || Number(rate) <= 0) {
      showToast.error("Please specify a valid Rate");
      setIsSubmitting(false);
      return;
    }
    formData.set("rate", rate.toString());
    formData.set("rateUnit", rateUnit);

    const result = await updateIntakeAction(intake.id, formData);
    setIsSubmitting(false);
    if (result?.error) {
      const presentation = getErrorPresentation(result);
      setErrorModal({
        isOpen: true,
        title: presentation.title,
        message: presentation.message,
        type: presentation.type
      });
    } else {
      showToast.success("Intake updated successfully");
      router.push(`/intake/${intake.id}`);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await executeSubmit(formData);
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (!errorModal.isOpen) {
          router.push(`/intake/${intake.id}`);
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [errorModal.isOpen, intake.id, router]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/intake/${intake.id}`}
            className="rounded-full p-2 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Purchase Intake {intake.intakeNumber}</h1>
            <p className="text-sm text-muted-foreground">Adjust purchase details if recorded incorrectly.</p>
          </div>
        </div>

        {/* Date Input at the top-right */}
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-sm">
          <label htmlFor="entryDate" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Entry Date
          </label>
          <input
            id="entryDate"
            name="entryDate"
            type="date"
            required
            defaultValue={getLocalDateString(intake.entryDate)}
            form="edit-intake-form"
            className="bg-transparent border-0 text-sm focus:outline-none focus:ring-0 outline-none font-mono w-36 text-foreground"
          />
        </div>
      </div>

      {/* Form Container */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <form 
          id="edit-intake-form"
          onSubmit={onSubmit} 
          className="space-y-6"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="partyId" className="text-sm font-medium">Supplier</label>
              <SearchableSelect
                id="partyId"
                name="partyId"
                required
                autoFocus
                value={selectedSupplierState}
                onChange={setSelectedSupplierState}
                options={supplierOptions}
                placeholder="Select a supplier..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="productId" className="text-sm font-medium">Product</label>
              <SearchableSelect
                id="productId"
                name="productId"
                required
                value={selectedProductId}
                onChange={handleProductChange}
                options={productOptions}
                placeholder="Select a product..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="unit" className="text-sm font-medium">Measurement Unit</label>
              <select
                id="unit"
                required
                disabled={!selectedProductId}
                value={unit || ""}
                onChange={e => handleUnitChange(e.target.value || null)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 font-medium"
              >
                {compatibleUnits.length === 0 ? (
                  <option value="">--</option>
                ) : (
                  compatibleUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="grossWeight" className="text-sm font-medium">
                Gross Quantity
              </label>
              <input
                id="grossWeight"
                type="number"
                step="0.01"
                required
                value={grossWeight}
                onChange={e => handleGrossWeightChange(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <select
                id="status"
                required
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
              >
                <option value="PENDING">Pending</option>
                <option value="SOLD">Sold</option>
                <option value="CLEARED">Cleared</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
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

          {/* Conditional PURCHASE mode section */}
          <div className="rounded-xl border bg-muted/20 p-6 space-y-6 mt-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Purchase Cost Parameters</h3>
                <p className="text-xs text-muted-foreground">Adjust purchase cost and unit</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Rate & Unit */}
              <div className="grid grid-cols-3 gap-3 col-span-2">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Purchase Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Purchase Cost..."
                    value={rate}
                    onChange={e => {
                      setRate(e.target.value);
                      setIsRateDirty(true);
                    }}
                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                  {prefillReason === "LAST_PURCHASE" && !isRateDirty && (
                    <p className="text-xs text-primary mt-1 font-medium">* Using last supplier purchase rate</p>
                  )}
                  {prefillReason === "PRODUCT_DEFAULT" && !isRateDirty && (
                    <p className="text-xs text-primary mt-1 font-medium">* Using default product cost</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Unit</label>
                  <select
                    disabled={!selectedProductId}
                    value={rateUnit || ""}
                    onChange={e => setRateUnit(e.target.value || null)}
                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 font-medium"
                  >
                    {compatibleUnits.length === 0 ? (
                      <option value="">--</option>
                    ) : (
                      compatibleUnits.map(u => (
                        <option key={u.id} value={u.id}>/ {u.id}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t font-medium">
            <Link
              href={`/intake/${intake.id}`}
              className="px-6 py-2 text-sm hover:bg-accent rounded-md transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
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
