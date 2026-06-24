"use client";

import React, { useState, useEffect } from "react";
import { updateIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { showToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUnitsByCategory, calculateIntakeNetWeight, normalizeQuantity, convertFromBase, UNIT_IDS, getUnitLabel, DEFAULT_WEIGHT_UNIT } from "@/lib/units";
import { Scale, User, DollarSign, Box, X, XCircle, ChevronLeft } from "lucide-react";
import { getProductValidationState } from "@/modules/products/utils/productValidation";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { getErrorPresentation } from "@/lib/errors/errorPresentation";
import { getLocalDateString } from "@/lib/utils";
import { getProductForIntake } from "@/modules/products/services/ProductInteractionService";

export default function EditIntakeForm({ intake, suppliers, products, buyers = [], allowedActions = {} }) {
  const router = useRouter();

  // Controlled States
  const [selectedProductId, setSelectedProductId] = useState(intake.productId.toString());
  const [grossWeight, setGrossWeight] = useState(intake.grossWeight || "");
  const [unit, setUnit] = useState(intake.unit || DEFAULT_WEIGHT_UNIT);
  const [bagCount, setBagCount] = useState(intake.bagCount || "");
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

  const buyerOptions = React.useMemo(() => buyers.map(b => ({
    value: b.id.toString(),
    label: b.name,
    subLabel: b.phoneNumber
  })), [buyers]);

  // SOLD calculations states
  const [buyerPartyId, setBuyerPartyId] = useState(intake.salesTracks?.[0]?.buyerPartyId?.toString() || "");
  const [rate, setRate] = useState(intake.rate || "");
  const [rateUnit, setRateUnit] = useState(intake.rateUnit || DEFAULT_WEIGHT_UNIT);
  const [bardanaGramPerBag, setBardanaGramPerBag] = useState(
    intake.Bardana && intake.bagCount ? Math.round((Number(intake.Bardana) * 1000) / Number(intake.bagCount)).toString() : "150"
  );
  const [khotRate, setKhotRate] = useState("0");
  const [khotRateUnit, setKhotRateUnit] = useState(DEFAULT_WEIGHT_UNIT);

  // Status Reversion states
  const [showUnbilledConfirmModal, setShowUnbilledConfirmModal] = useState(false);
  const [showBilledBlockModal, setShowBilledBlockModal] = useState(false);
  const [showSupplierBlockModal, setShowSupplierBlockModal] = useState(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "", type: "error" });
  const [unitRegistry, setUnitRegistry] = useState(null);

  const salesTrack = intake.salesTracks?.[0];
  const hasSalesTrack = !!salesTrack;
  const isBilled = salesTrack ? (salesTrack.isBilled || salesTrack.saleTransactionId !== null) : false;

  const supplierInvoiceItem = intake.invoiceItems?.[0];
  const hasSupplierInvoice = !!supplierInvoiceItem;

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
      // For refraction/tare weight calculations when status is SOLD, sync bagCount with helperQuantity if type is bag
      if (helperUnitLabel.toLowerCase() === "bag") {
        setBagCount(Math.round(parseFloat(qty)).toString());
      }
    } else {
      setGrossWeight("");
    }
  };

  // Real-time calculation logic
  const { grossWeightKg, bardanaKg, khotKg, netWeightKg, netWeight } = calculateIntakeNetWeight({
    grossWeight: Number(grossWeight) || 0,
    unit: unit,
    bagCount: Number(bagCount) || 0,
    bardanaGramPerBag: Number(bardanaGramPerBag) || 0,
    khotRate: Number(khotRate) || 0,
    khotRateUnit: khotRateUnit,
    product: selectedProduct,
    unitRegistry
  });

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
      formData.set("bagCount", bagCount || "");
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

    if (status === "SOLD") {
      const requireBuyer = allowedActions.rules?.requiresBuyer;
      if (requireBuyer && !buyerPartyId) {
        showToast.error("Please select a buyer Party");
        setIsSubmitting(false);
        return;
      }
      if (!rate || Number(rate) <= 0) {
        showToast.error("Please specify a valid Rate");
        setIsSubmitting(false);
        return;
      }
      formData.set("buyerPartyId", buyerPartyId);
      formData.set("rate", rate.toString());
      formData.set("rateUnit", rateUnit);
      formData.set("Bardana", bardanaKg.toString());
      formData.set("Khot", khotKg.toString());
      formData.set("netWeight", netWeight.toString());
    }

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

    const isReverting = (intake.status === "SOLD" || intake.status === "CLEARED") && (status === "PENDING" || status === "CANCELLED");
    if (isReverting) {
      if (hasSupplierInvoice) {
        setShowSupplierBlockModal(true);
        return;
      }
      if (hasSalesTrack) {
        if (isBilled) {
          setShowBilledBlockModal(true);
          return;
        } else {
          setFormDataToSubmit(formData);
          setShowUnbilledConfirmModal(true);
          return;
        }
      }
    }

    await executeSubmit(formData);
  };

  const confirmRevertSubmit = async () => {
    setShowUnbilledConfirmModal(false);
    if (formDataToSubmit) {
      await executeSubmit(formDataToSubmit);
      setFormDataToSubmit(null);
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (
          !showBilledBlockModal && 
          !showSupplierBlockModal && 
          !errorModal.isOpen && 
          !showUnbilledConfirmModal
        ) {
          router.push(`/intake/${intake.id}`);
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showBilledBlockModal, showSupplierBlockModal, errorModal.isOpen, showUnbilledConfirmModal, intake.id, router]);


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
            <h1 className="text-2xl font-bold tracking-tight">Edit Intake {intake.intakeNumber}</h1>
            <p className="text-sm text-muted-foreground">Adjust arrival details if recorded incorrectly.</p>
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
            value={unit || ""}
            onChange={e => handleUnitChange(e.target.value || null)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
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

      {/* Conditional SOLD status section */}
      {status === "SOLD" && (
        <div className="rounded-xl border bg-muted/20 p-6 space-y-6 mt-6 animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 border-b pb-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Sell & Refraction Parameters</h3>
              <p className="text-xs text-muted-foreground">Adjust buyer, selling rate, and tare/impurity weights</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Buyer */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Buyer Party
              </label>
              <SearchableSelect
                id="buyerPartyId"
                name="buyerPartyId"
                required={allowedActions.rules?.requiresBuyer}
                value={buyerPartyId}
                onChange={setBuyerPartyId}
                options={buyerOptions}
                placeholder="Select Buyer..."
              />
            </div>

            {/* Rate & Unit */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Rate
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Rate..."
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Unit</label>
                <select
                  value={rateUnit || ""}
                  onChange={e => setRateUnit(e.target.value || null)}
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium"
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

            {/* Bardana */}
            <div className="space-y-3 border p-4 rounded-xl bg-card">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Box className="h-3.5 w-3.5 text-amber-600" /> Bardana (Tare Weight)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Bags</label>
                  <input
                    type="number"
                    value={bagCount}
                    onChange={e => setBagCount(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Grams/Bag</label>
                  <input
                    type="number"
                    value={bardanaGramPerBag}
                    onChange={e => setBardanaGramPerBag(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded flex justify-between font-mono">
                <span>Calculated Bardana:</span>
                <span className="font-semibold text-foreground">{bardanaKg.toFixed(2)} KG</span>
              </div>
            </div>

            {/* Khot */}
            <div className="space-y-3 border p-4 rounded-xl bg-card">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 text-rose-600" /> Khot (Impurity Deduction)
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Impurity (Grams)</label>
                  <input
                    type="number"
                    value={khotRate}
                    onChange={e => setKhotRate(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Per Unit</label>
                  <select
                    value={khotRateUnit}
                    onChange={e => setKhotRateUnit(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                  >
                    <option value={UNIT_IDS.KG}>/ KG</option>
                    <option value={UNIT_IDS.MAUND}>/ Maund</option>
                  </select>
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded flex justify-between font-mono">
                <span>Calculated Khot:</span>
                <span className="font-semibold text-foreground">{khotKg.toFixed(2)} KG</span>
              </div>
            </div>
          </div>

          {/* Live netWeight Display */}
          <div className="bg-emerald-50 border border-emerald-200/50 p-4 rounded-xl flex items-center justify-between mt-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">Computed Net Weight (For Billing)</span>
              <div className="text-2xl font-black text-emerald-700 font-mono">
                {unit === UNIT_IDS.BAG ? (
                  <>
                    {netWeightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-xs font-normal uppercase ml-1 italic">KG</span>
                  </>
                ) : (
                  <>
                    {netWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="text-xs font-normal uppercase ml-1 italic">{getUnitLabel(unit)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
              <Scale className="h-6 w-6" />
            </div>
          </div>
        </div>
      )}

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

      {/* Unbilled Status Revert Confirmation Modal */}
      <Modal
        isOpen={showUnbilledConfirmModal}
        onClose={() => {
          setShowUnbilledConfirmModal(false);
          setFormDataToSubmit(null);
        }}
        title="Revert Intake Status"
        description="Reverting will remove sales trace"
        type="warning"
        confirmLabel="Confirm Revert"
        onConfirm={confirmRevertSubmit}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Reverting this intake&apos;s status to <span className="font-bold text-foreground">{status}</span> will have the following operational consequences:
          </p>
          
          <ul className="space-y-2 text-xs text-muted-foreground bg-muted/40 p-4 rounded-xl border border-muted-foreground/10">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Remove Source Tracking</strong>: The active sales trace tied to buyer <strong>{salesTrack?.buyer?.name || "N/A"}</strong> will be permanently deleted.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Remove Billing Eligibility</strong>: It will no longer be eligible to generate a Sales Invoice.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Restore Inventory</strong>: The quantity ({Number(intake.baseQuantity || 0).toLocaleString()} KG) will be returned to inventory.</span>
            </li>
          </ul>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex gap-3 text-xs text-amber-800 dark:text-amber-300">
            <span className="font-black text-sm">⚠️</span>
            <span>This action cannot be undone. Make sure you want to revert this transaction&apos;s status.</span>
          </div>
        </div>
      </Modal>

      {/* Billed Status Revert Block Modal */}
      <Modal
        isOpen={showBilledBlockModal}
        onClose={() => setShowBilledBlockModal(false)}
        title="Reversion Blocked"
        description="Intake is already billed"
        type="error"
        confirmLabel="Close Dialog"
        onConfirm={() => setShowBilledBlockModal(false)}
        cancelLabel={null}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            This intake is already included in a finalized invoice/sale transaction, so you cannot revert its status.
          </p>

          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-rose-900 dark:text-rose-400">Linked Sales Trace Info:</div>
            <div className="grid grid-cols-2 gap-y-1 text-muted-foreground">
              <div>Buyer Party:</div>
              <div className="font-semibold text-foreground">{salesTrack?.buyer?.name || "N/A"}</div>
              <div>Weight:</div>
              <div className="font-semibold text-foreground">{Number(salesTrack?.quantity || 0).toLocaleString()} {intake.unit}</div>
              <div>Invoice ID / Status:</div>
              <div className="font-semibold text-rose-700 dark:text-rose-400">Billed & Finalized</div>
            </div>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/20 p-3.5 rounded-lg border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 leading-normal">
            <strong>How to resolve:</strong> You must first edit or delete the associated Sales Invoice in the Sales/Billing module to remove this intake before you can revert its status here.
          </div>
        </div>
      </Modal>

      {/* Supplier Settlement Revert Block Modal */}
      <Modal
        isOpen={showSupplierBlockModal}
        onClose={() => setShowSupplierBlockModal(false)}
        title="Reversion Blocked"
        description="Intake is settled with supplier"
        type="error"
        confirmLabel="Close Dialog"
        onConfirm={() => setShowSupplierBlockModal(false)}
        cancelLabel={null}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            This intake is already included in a finalized **Supplier Settlement / Invoice**, so you cannot revert its status.
          </p>

          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-rose-900 dark:text-rose-400">Linked Supplier Settlement Info:</div>
            <div className="grid grid-cols-2 gap-y-1 text-muted-foreground">
              <div>Supplier Invoice:</div>
              <div className="font-semibold text-foreground">{supplierInvoiceItem?.invoice?.invoiceNumber || "N/A"}</div>
              <div>Settled Weight:</div>
              <div className="font-semibold text-foreground">{Number(supplierInvoiceItem?.weight || 0).toLocaleString()} KG</div>
              <div>Supplier Settlement Status:</div>
              <div className="font-semibold text-rose-700 dark:text-rose-400">{supplierInvoiceItem?.invoice?.status || "COMPLETED"}</div>
            </div>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/20 p-3.5 rounded-lg border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 leading-normal">
            <strong>How to resolve:</strong> You must first edit or delete the associated Supplier Invoice <strong>{supplierInvoiceItem?.invoice?.invoiceNumber || ""}</strong> in the Supplier Invoices module to exclude this intake before you can revert its status here.
          </div>
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
      </div>
    </div>
  );
}
