"use client";

import React, { useState } from "react";
import { updateIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { showToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUnitsByCategory, calculateIntakeNetWeight, normalizeQuantity, convertFromBase, UNIT_IDS, getUnitLabel, DEFAULT_UNIT } from "@/lib/units";
import { Scale, User, DollarSign, Box, X, XCircle } from "lucide-react";
import { getPreferredWeightUnit, getPreferredRateUnit } from "@/lib/display-units";
import Modal from "@/components/ui/Modal";
import { getErrorPresentation } from "@/lib/errors/errorPresentation";

export default function EditIntakeForm({ intake, suppliers, products, buyers = [] }) {
  const router = useRouter();

  // Controlled States
  const [selectedProductId, setSelectedProductId] = useState(intake.productId.toString());
  const [grossWeight, setGrossWeight] = useState(intake.grossWeight || "");
  const [unit, setUnit] = useState(intake.unit || DEFAULT_UNIT);
  const [bagCount, setBagCount] = useState(intake.bagCount || "");
  const [status, setStatus] = useState(intake.status || "PENDING");
  const [notes, setNotes] = useState(intake.notes || "");

  // SOLD calculations states
  const [buyerPartyId, setBuyerPartyId] = useState(intake.salesTracks?.[0]?.buyerPartyId?.toString() || "");
  const [rate, setRate] = useState(intake.rate || "");
  const [rateUnit, setRateUnit] = useState(intake.rateUnit || DEFAULT_UNIT);
  const [bardanaGramPerBag, setBardanaGramPerBag] = useState(
    intake.Bardana && intake.bagCount ? Math.round((Number(intake.Bardana) * 1000) / Number(intake.bagCount)).toString() : "150"
  );
  const [khotRate, setKhotRate] = useState("0");
  const [khotRateUnit, setKhotRateUnit] = useState(DEFAULT_UNIT);

  // Status Reversion states
  const [showUnbilledConfirmModal, setShowUnbilledConfirmModal] = useState(false);
  const [showBilledBlockModal, setShowBilledBlockModal] = useState(false);
  const [showSupplierBlockModal, setShowSupplierBlockModal] = useState(false);
  const [formDataToSubmit, setFormDataToSubmit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "", type: "error" });

  const salesTrack = intake.salesTracks?.[0];
  const hasSalesTrack = !!salesTrack;
  const isBilled = salesTrack ? (salesTrack.isBilled || salesTrack.saleTransactionId !== null) : false;

  const supplierInvoiceItem = intake.invoiceItems?.[0];
  const hasSupplierInvoice = !!supplierInvoiceItem;

  React.useEffect(() => {
    if (!intake.unit) {
      setUnit(getPreferredWeightUnit());
    }
    if (!intake.rateUnit || intake.status === "PENDING") {
      setRateUnit(getPreferredRateUnit());
    }
  }, [intake]);

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));
  const isBagProduct = selectedProduct?.primaryUnit === "BAG" && selectedProduct?.unitConversion && Number(selectedProduct.unitConversion) > 0;
  const compatibleUnits = selectedProduct ? getUnitsByCategory(selectedProduct.category) : [];

  const handleProductChange = (productId) => {
    setSelectedProductId(productId);
    const prod = products.find(p => p.id === parseInt(productId));
    if (prod) {
      const units = getUnitsByCategory(prod.category);
      const prefUnit = getPreferredWeightUnit();
      const isPrefCompatible = units.some(u => u.id === prefUnit);
      const defaultUnit = isPrefCompatible ? prefUnit : (prod.primaryUnit || DEFAULT_UNIT);
      setUnit(defaultUnit);

      const isProdBag = prod.primaryUnit === UNIT_IDS.BAG && prod.unitConversion && Number(prod.unitConversion) > 0;
      if (defaultUnit === UNIT_IDS.BAG) {
        setGrossWeight(bagCount);
      } else if (isProdBag && grossWeight) {
        const weightInKg = normalizeQuantity(grossWeight, defaultUnit, prod);
        const bags = convertFromBase(weightInKg, UNIT_IDS.BAG, prod);
        const calculatedBags = Math.ceil(bags);
        setBagCount(calculatedBags ? calculatedBags.toString() : "");
      }
    } else {
      setUnit("");
      setGrossWeight("");
      setBagCount("");
    }
  };

  const handleGrossWeightChange = (val) => {
    setGrossWeight(val);
    if (isBagProduct && (unit === UNIT_IDS.KG || unit === UNIT_IDS.MAUND)) {
      const weightInKg = normalizeQuantity(val, unit, selectedProduct);
      const bags = convertFromBase(weightInKg, UNIT_IDS.BAG, selectedProduct);
      const calculatedBags = Math.ceil(bags);
      setBagCount(calculatedBags ? calculatedBags.toString() : "");
    }
  };

  const handleUnitChange = (newUnit) => {
    setUnit(newUnit);
    if (newUnit === UNIT_IDS.BAG) {
      setGrossWeight(bagCount);
    } else if (isBagProduct) {
      const weightInKg = normalizeQuantity(grossWeight, newUnit, selectedProduct);
      const bags = convertFromBase(weightInKg, UNIT_IDS.BAG, selectedProduct);
      const calculatedBags = Math.ceil(bags);
      setBagCount(calculatedBags ? calculatedBags.toString() : "");
    }
  };

  const handleBagCountChange = (val) => {
    setBagCount(val);
    if (unit === UNIT_IDS.BAG) {
      setGrossWeight(val);
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
    product: selectedProduct
  });

  const executeSubmit = async (formData) => {
    setIsSubmitting(true);
    formData.set("productId", selectedProductId);
    formData.set("unit", unit);
    formData.set("grossWeight", grossWeight);
    formData.set("bagCount", bagCount);
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
      if (!buyerPartyId) {
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

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="partyId" className="text-sm font-medium">Supplier</label>
          <select
            id="partyId"
            name="partyId"
            required
            defaultValue={intake.partyId}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.phoneNumber})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="productId" className="text-sm font-medium">Product</label>
          <select
            id="productId"
            required
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="unit" className="text-sm font-medium">Measurement Unit</label>
          <select
            id="unit"
            required
            value={unit}
            onChange={e => handleUnitChange(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            {compatibleUnits.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="grossWeight" className="text-sm font-medium">
            Gross Weight {unit === UNIT_IDS.BAG ? "(Calculated in KG)" : ""}
          </label>
          {unit === UNIT_IDS.BAG ? (
            <>
              <input
                id="grossWeight_display"
                type="text"
                readOnly
                value={selectedProduct ? normalizeQuantity(bagCount || 0, UNIT_IDS.BAG, selectedProduct).toFixed(2) : ""}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-muted cursor-not-allowed text-muted-foreground font-semibold"
              />
              <input
                type="hidden"
                name="grossWeight"
                value={grossWeight}
              />
            </>
          ) : (
            <input
              id="grossWeight"
              type="number"
              step="0.01"
              required
              value={grossWeight}
              onChange={e => handleGrossWeightChange(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
            />
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="bagCount" className="text-sm font-medium">
            {unit === UNIT_IDS.BAG ? "Bag Count (Required)" : (isBagProduct ? "Bag Count (Calculated)" : "Bag Count (Optional)")}
          </label>
          <input
            id="bagCount"
            type="number"
            required={unit === UNIT_IDS.BAG}
            readOnly={unit !== UNIT_IDS.BAG && isBagProduct}
            placeholder={unit === UNIT_IDS.BAG ? "Enter number of bags..." : (isBagProduct ? "Automatically calculated" : "e.g. 50")}
            value={bagCount}
            onChange={e => handleBagCountChange(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${unit !== UNIT_IDS.BAG && isBagProduct ? "bg-muted cursor-not-allowed text-muted-foreground" : "bg-background"}`}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="entryDate" className="text-sm font-medium">Entry Date</label>
          <input
            id="entryDate"
            name="entryDate"
            type="date"
            required
            defaultValue={new Date(intake.entryDate).toISOString().split('T')[0]}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
              <select
                value={buyerPartyId}
                onChange={e => setBuyerPartyId(e.target.value)}
                className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium"
              >
                <option value="">Select Buyer...</option>
                {buyers.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.phoneNumber})</option>
                ))}
              </select>
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
                  value={rateUnit}
                  onChange={e => setRateUnit(e.target.value)}
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                >
                  <option value={UNIT_IDS.KG}>/ KG</option>
                  <option value={UNIT_IDS.MAUND}>/ Maund</option>
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
              <span><strong>Restore Inventory</strong>: The quantity ({Number(intake.normalizedWeight || 0).toLocaleString()} KG) will be returned to inventory.</span>
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
  );
}
