"use client";

import React, { useState, useEffect } from "react";
import { updateIntakeAction, sellIntakeAction, updateIntakeStatusAction } from "@/modules/intake/controllers/intakeActions";
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { showToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { calculateIntakeNetWeight, UNIT_IDS, getUnitLabel, DEFAULT_WEIGHT_UNIT, getUnitsByCategory } from "@/lib/units";
import { Scale, User, DollarSign, Box, ChevronLeft, Truck, CheckCircle2, AlertCircle, Lock, Save, Edit3 } from "lucide-react";
import { getProductValidationState } from "@/modules/products/utils/productValidation";
import Modal from "@/components/ui/Modal";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { getErrorPresentation } from "@/lib/errors/errorPresentation";
import { getLocalDateString } from "@/lib/utils";
import { getProductForIntake } from "@/modules/products/services/ProductInteractionService";

export default function ReceiptEditIntakeForm({ intake, suppliers, products, buyers = [], allowedActions = {}, featureFlags }) {
  const router = useRouter();

  // ──────────────────────────────────────────────────────────────────────────
  // STATES
  // ──────────────────────────────────────────────────────────────────────────
  const [unitRegistry, setUnitRegistry] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: "", message: "", type: "error" });

  // Modals for status revert
  const [showUnbilledConfirmModal, setShowUnbilledConfirmModal] = useState(false);
  const [showBilledBlockModal, setShowBilledBlockModal] = useState(false);
  const [showSupplierBlockModal, setShowSupplierBlockModal] = useState(false);
  const [statusToRevert, setStatusToRevert] = useState(null);

  // Section 1: Arrival States
  const [selectedSupplierState, setSelectedSupplierState] = useState(intake.partyId.toString());
  const [selectedProductId, setSelectedProductId] = useState(intake.productId.toString());
  const [entryDate, setEntryDate] = useState(getLocalDateString(intake.entryDate));
  const [notes, setNotes] = useState(intake.notes || "");
  const [unit, setUnit] = useState(intake.unit || DEFAULT_WEIGHT_UNIT);

  const initialArrivalMeta = intake.arrivalMeta ? (typeof intake.arrivalMeta === "string" ? JSON.parse(intake.arrivalMeta) : intake.arrivalMeta) : null;
  const [containerType, setContainerType] = useState(initialArrivalMeta?.containerType || "Bag");
  const [containerCount, setContainerCount] = useState(initialArrivalMeta?.containerCount || "");
  const [transportType, setTransportType] = useState(initialArrivalMeta?.transportType || "Tractor Trolley");
  const [transportIdentifier, setTransportIdentifier] = useState(initialArrivalMeta?.transportIdentifier || "");
  const [deliveredBy, setDeliveredBy] = useState(initialArrivalMeta?.deliveredBy || "");

  // Section 2: Selling States
  const hasSalesTrack = intake.salesTracks && intake.salesTracks.length > 0;
  const firstSalesTrack = hasSalesTrack ? intake.salesTracks[0] : null;

  const [buyerPartyId, setBuyerPartyId] = useState(firstSalesTrack?.buyerPartyId?.toString() || "");
  const [rate, setRate] = useState(intake.rate || "");
  const [rateUnit, setRateUnit] = useState(intake.rateUnit || DEFAULT_WEIGHT_UNIT);

  // Section 3: Weight States
  const [grossWeight, setGrossWeight] = useState(intake.grossWeight || "");
  const [bagCount, setBagCount] = useState(intake.bagCount || "");
  const [bardanaGramPerBag, setBardanaGramPerBag] = useState(
    intake.Bardana && intake.bagCount ? Math.round((Number(intake.Bardana) * 1000) / Number(intake.bagCount)).toString() : "150"
  );
  const [khotRate, setKhotRate] = useState("0");
  const [khotRateUnit, setKhotRateUnit] = useState(DEFAULT_WEIGHT_UNIT);

  // Section 4: Finance / Final Status
  const [status, setStatus] = useState(intake.status || "PENDING");

  // ──────────────────────────────────────────────────────────────────────────
  // DERIVED WORKFLOW STATES
  // ──────────────────────────────────────────────────────────────────────────
  // Section 1: Arrival (always complete since we are editing a created intake)
  const isSection1Complete = true;

  // Section 2: Selling
  const isSection2Complete = hasSalesTrack && intake.rate !== null && Number(intake.rate) > 0;

  // Section 3: Weight
  const isSection3Complete = intake.isWeightRecorded === true;

  // Section 4: Finance (requires both Selling and Weight to be complete)
  const isSection4Locked = !isSection2Complete || !isSection3Complete;
  const isSection4Complete = intake.status === "CLEARED";

  // Reversion Checks helper info
  const isBilled = firstSalesTrack ? (firstSalesTrack.isBilled || firstSalesTrack.saleTransactionId !== null) : false;
  const supplierInvoiceItem = intake.invoiceItems?.[0];
  const hasSupplierInvoice = !!supplierInvoiceItem;

  // ──────────────────────────────────────────────────────────────────────────
  // OPTIONS & HELPERS
  // ──────────────────────────────────────────────────────────────────────────
  const supplierOptions = React.useMemo(() => suppliers.map(s => ({
    value: s.id.toString(),
    label: s.name,
    subLabel: s.phoneNumber
  })), [suppliers]);

  const productOptions = React.useMemo(() => products.map(p => ({
    value: p.id.toString(),
    label: p.name
  })), [products]);

  const buyerOptions = React.useMemo(() => buyers.map(b => ({
    value: b.id.toString(),
    label: b.name,
    subLabel: b.phoneNumber
  })), [buyers]);

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));
  const compatibleUnits = selectedProduct
    ? (unitRegistry
        ? Object.values(unitRegistry.units).filter(u => u.unitCategoryCode === (selectedProduct.unitCategory || selectedProduct.category)).map(u => ({ id: u.code, name: u.name }))
        : getUnitsByCategory(selectedProduct.category))
    : [];

  useEffect(() => {
    async function loadRegistry() {
      const res = await getUnitRegistryAction();
      if (res.success) setUnitRegistry(res.data);
    }
    loadRegistry();
  }, []);

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
    }
  };

  // Real-time weight calculation logic
  let grossWeightKg = 0, bardanaKg = 0, khotKg = 0, netWeightKg = 0, netWeight = 0;
  try {
    const calculated = calculateIntakeNetWeight({
      grossWeight: Number(grossWeight) || 0,
      unit: unit,
      bagCount: Number(bagCount) || 0,
      bardanaGramPerBag: Number(bardanaGramPerBag) || 0,
      khotRate: Number(khotRate) || 0,
      khotRateUnit: khotRateUnit,
      product: selectedProduct,
      unitRegistry
    });
    grossWeightKg = calculated.grossWeightKg;
    bardanaKg = calculated.bardanaKg;
    khotKg = calculated.khotKg;
    netWeightKg = calculated.netWeightKg;
    netWeight = calculated.netWeight;
  } catch (err) {}

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION SAVE HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  const handleSaveArrival = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("partyId", selectedSupplierState);
    formData.set("productId", selectedProductId);
    formData.set("entryDate", entryDate);
    formData.set("notes", notes);
    formData.set("unit", unit);

    const arrivalMeta = {
      containerType,
      containerCount: containerCount ? parseInt(containerCount) : null,
      transportType,
      transportIdentifier,
      deliveredBy
    };
    formData.set("arrivalMeta", JSON.stringify(arrivalMeta));

    const result = await updateIntakeAction(intake.id, formData);
    setIsSubmitting(false);
    if (result?.error) {
      showToast.error(result.error);
    } else {
      showToast.success("Arrival details saved successfully");
      router.refresh();
    }
  };

  const handleSaveSelling = async (e) => {
    e.preventDefault();
    if (!buyerPartyId) {
      showToast.error("Buyer party is required to save sale details");
      return;
    }
    if (!rate || Number(rate) <= 0) {
      showToast.error("Please specify a valid Rate");
      return;
    }
    setIsSubmitting(true);
    const result = await sellIntakeAction(intake.id, {
      buyerPartyId,
      rate,
      rateUnit,
      isPartialSale: false
    });
    setIsSubmitting(false);
    if (result?.error) {
      showToast.error(result.error);
    } else {
      showToast.success("Selling details saved successfully");
      router.refresh();
    }
  };

  const handleSaveWeight = async (e) => {
    e.preventDefault();
    if (!grossWeight || Number(grossWeight) <= 0) {
      showToast.error("Please specify a valid gross weight");
      return;
    }
    setIsSubmitting(true);
    const formData = new FormData();
    formData.set("grossWeight", grossWeight);
    formData.set("bagCount", bagCount || "");
    formData.set("Bardana", bardanaKg.toString());
    formData.set("Khot", khotKg.toString());
    formData.set("netWeight", netWeight.toString());
    formData.set("unit", unit);

    const result = await updateIntakeAction(intake.id, formData);
    setIsSubmitting(false);
    if (result?.error) {
      showToast.error(result.error);
    } else {
      showToast.success("Weight calculation saved successfully");
      router.refresh();
    }
  };

  const handleSaveFinance = async (e) => {
    e.preventDefault();
    
    // Status Reversion Safeguards
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
          setStatusToRevert(status);
          setShowUnbilledConfirmModal(true);
          return;
        }
      }
    }

    await executeFinanceStatusSave(status);
  };

  const executeFinanceStatusSave = async (finalStatus) => {
    setIsSubmitting(true);
    const result = await updateIntakeStatusAction(intake.id, finalStatus, notes);
    setIsSubmitting(false);
    if (result?.error) {
      showToast.error(result.error);
    } else {
      showToast.success("Status finalized successfully");
      router.push(`/intake/${intake.id}`);
    }
  };

  const confirmRevertSubmit = async () => {
    setShowUnbilledConfirmModal(false);
    if (statusToRevert) {
      await executeFinanceStatusSave(statusToRevert);
      setStatusToRevert(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/intake/${intake.id}`}
            className="rounded-full p-2 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workflow: {intake.intakeNumber}</h1>
            <p className="text-sm text-muted-foreground">Manage progressive intake steps from arrival to clearing.</p>
          </div>
        </div>

        {/* Global Progress Indicator */}
        <div className="flex items-center gap-2 bg-muted/40 border rounded-lg px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground shadow-sm">
          <span>Weighed:</span>
          {isSection3Complete ? (
            <span className="text-emerald-600">Yes</span>
          ) : (
            <span className="text-amber-500 animate-pulse">Pending</span>
          )}
          <span className="mx-2">|</span>
          <span>Status:</span>
          <span className="text-foreground">{intake.status}</span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1: ARRIVAL DETAILS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Section 1: Arrival & Transport Details</h2>
              <p className="text-xs text-muted-foreground">Log supplier product and transport load details</p>
            </div>
          </div>
          <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200/50 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Complete</span>
          </div>
        </div>

        <form onSubmit={handleSaveArrival} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="partyId" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Supplier</label>
              <SearchableSelect
                id="partyId"
                name="partyId"
                required
                value={selectedSupplierState}
                onChange={setSelectedSupplierState}
                options={supplierOptions}
                placeholder="Select supplier..."
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="productId" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Product</label>
              <SearchableSelect
                id="productId"
                name="productId"
                required
                value={selectedProductId}
                onChange={handleProductChange}
                options={productOptions}
                placeholder="Select product..."
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 bg-muted/20 p-4 rounded-xl border">
            <div className="space-y-2">
              <label htmlFor="containerType" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Container Type</label>
              <select
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
                id="transportIdentifier"
                type="text"
                placeholder="e.g. LHR-4321"
                value={transportIdentifier}
                onChange={(e) => setTransportIdentifier(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="deliveredBy" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Driver / Bearer Name</label>
              <input
                id="deliveredBy"
                type="text"
                placeholder="e.g. Muhammad Jameel"
                value={deliveredBy}
                onChange={(e) => setDeliveredBy(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 items-end">
            <div className="space-y-2 md:col-span-2">
              <label htmlFor="notes" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Notes / Remarks</label>
              <input
                id="notes"
                type="text"
                placeholder="Remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="entryDate" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Arrival Date</label>
              <input
                id="entryDate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/95 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Save Arrival Details</span>
            </button>
          </div>
        </form>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2: SELLING DETAILS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Section 2: Selling Details</h2>
              <p className="text-xs text-muted-foreground">Link buyer party, sale rates, and configure trace</p>
            </div>
          </div>
          {isSection2Complete ? (
            <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200/50 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Complete</span>
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-200/50 flex items-center gap-1 animate-pulse">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Pending Sale</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveSelling} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="buyerPartyId" className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> Buyer Party
              </label>
              <SearchableSelect
                id="buyerPartyId"
                name="buyerPartyId"
                required
                value={buyerPartyId}
                onChange={setBuyerPartyId}
                options={buyerOptions}
                placeholder="Select buyer..."
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Sale Rate
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
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Unit</label>
                <select
                  disabled={!selectedProductId}
                  value={rateUnit || ""}
                  onChange={e => setRateUnit(e.target.value || null)}
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 font-medium"
                >
                  {compatibleUnits.map(u => (
                    <option key={u.id} value={u.id}>/ {u.id}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/95 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Save Sale details</span>
            </button>
          </div>
        </form>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3: WEIGHT & REFRACTION CALCULATION */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Section 3: Weight & Refraction Calculation</h2>
              <p className="text-xs text-muted-foreground">Compute actual gross and net weights, subtracting tares</p>
            </div>
          </div>
          {isSection3Complete ? (
            <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200/50 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Weighed</span>
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-200/50 flex items-center gap-1 animate-pulse">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Weight Pending</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveWeight} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="grossWeight" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Gross Weight</label>
              <div className="relative">
                <input
                  id="grossWeight"
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={grossWeight}
                  onChange={e => setGrossWeight(e.target.value)}
                  className="w-full rounded-md border bg-background pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <span className="absolute right-3 top-2 text-xs text-muted-foreground uppercase">{unit}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="bagCount" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Bag Count</label>
              <input
                id="bagCount"
                type="number"
                placeholder="Bags..."
                value={bagCount}
                onChange={e => setBagCount(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="unit" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Weight Unit</label>
              <select
                id="unit"
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
              >
                {compatibleUnits.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 bg-muted/20 p-4 rounded-xl border">
            {/* Bardana */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Box className="h-3.5 w-3.5 text-amber-600" /> Bardana Grams/Bag
              </label>
              <input
                type="number"
                value={bardanaGramPerBag}
                onChange={e => setBardanaGramPerBag(e.target.value)}
                className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
              />
              <div className="text-[11px] text-muted-foreground font-mono flex justify-between px-1">
                <span>Calculated Bardana:</span>
                <span className="font-bold text-foreground">{bardanaKg.toFixed(2)} KG</span>
              </div>
            </div>

            {/* Khot */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider flex items-center gap-1">
                <Scale className="h-3.5 w-3.5 text-rose-600" /> Khot Impurities
              </label>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={khotRate}
                  onChange={e => setKhotRate(e.target.value)}
                  className="col-span-2 w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-mono"
                />
                <select
                  value={khotRateUnit}
                  onChange={e => setKhotRateUnit(e.target.value)}
                  className="w-full bg-background border rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value={UNIT_IDS.KG}>/ KG</option>
                  <option value={UNIT_IDS.MAUND}>/ Maund</option>
                </select>
              </div>
              <div className="text-[11px] text-muted-foreground font-mono flex justify-between px-1">
                <span>Calculated Khot:</span>
                <span className="font-bold text-foreground">{khotKg.toFixed(2)} KG</span>
              </div>
            </div>
          </div>

          {/* Real-time Net Weight calculations banner */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 p-4 rounded-xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-400 tracking-wider">Computed Net Weight (Finalized)</span>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {netWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-normal uppercase ml-1 italic">{getUnitLabel(unit)}</span>
              </div>
            </div>
            <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2.5 rounded-lg text-emerald-700 dark:text-emerald-400">
              <Scale className="h-6 w-6" />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/95 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Save Weight details</span>
            </button>
          </div>
        </form>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 4: FINANCE & CLEARING */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className={`rounded-xl border bg-card p-6 shadow-sm space-y-6 relative overflow-hidden transition-all duration-300 ${isSection4Locked ? "bg-muted/30 border-muted" : ""}`}>
        {/* Padlock locked overlay */}
        {isSection4Locked && (
          <div className="absolute inset-0 bg-background/50 dark:bg-background/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10 animate-in fade-in duration-300">
            <div className="bg-muted border shadow-sm p-3 rounded-full text-muted-foreground animate-bounce">
              <Lock className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-foreground">Section Locked</p>
            <p className="text-xs text-muted-foreground max-w-sm text-center px-6">
              Please complete Section 2 (Selling Details) and Section 3 (Weight details) to unlock Finance & Status Finalization.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Section 4: Finance & Status Finalization</h2>
              <p className="text-xs text-muted-foreground">Finalize lifecycle status and sync ledger invoices</p>
            </div>
          </div>
          {isSection4Complete ? (
            <div className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-200/50 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Cleared</span>
            </div>
          ) : (
            <div className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              <span>Unfinalized</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSaveFinance} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="status" className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Workflow Status</label>
              <select
                id="status"
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-semibold"
              >
                <option value="PENDING">Pending (Draft)</option>
                <option value="SOLD">Sold</option>
                <option value="CLEARED">Cleared (Settled)</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200/50 p-4 rounded-xl text-xs space-y-1.5 leading-relaxed">
            <h4 className="font-bold text-blue-900 dark:text-blue-400">Clearing & Ledger Sync Info:</h4>
            <p className="text-muted-foreground">
              Transitioning this intake to <strong className="text-foreground">CLEARED</strong> commits the average buying rate to the supplier ledger and registers weight-accurate balances for final settlement generation. Reverting status is prohibited once invoices are generated.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/95 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Finalize Status & Clear</span>
            </button>
          </div>
        </form>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODALS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* Unbilled Status Revert Confirmation Modal */}
      <Modal
        isOpen={showUnbilledConfirmModal}
        onClose={() => {
          setShowUnbilledConfirmModal(false);
          setStatusToRevert(null);
        }}
        title="Revert Intake Status"
        description="Reverting will remove sales trace"
        type="warning"
        confirmLabel="Confirm Revert"
        onConfirm={confirmRevertSubmit}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Reverting this intake&apos;s status will delete the active sales trace tied to buyer <strong>{firstSalesTrack?.buyer?.name || "N/A"}</strong>, remove invoice eligibility, and restore inventory stock.
          </p>
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
            This intake is already included in a finalized invoice/sale transaction, so you cannot revert its status. You must first delete/edit the Sales Invoice.
          </p>
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
            This intake is already settled with the supplier (Invoice <strong>{supplierInvoiceItem?.invoice?.invoiceNumber || ""}</strong>), so you cannot revert its status.
          </p>
        </div>
      </Modal>
    </div>
  );
}
