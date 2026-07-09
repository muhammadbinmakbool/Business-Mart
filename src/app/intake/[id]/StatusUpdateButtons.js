"use client";

import React, { useState } from "react";
import { updateIntakeStatusAction, sellIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { getUnitRegistryAction } from "@/modules/products/controllers/unitActions";
import { showToast } from "@/components/ui/Toast";
import { Clock, BadgeCheck, ShoppingBag, XCircle, X, Scale, User, DollarSign, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateIntakeNetWeight, UNIT_IDS, getUnitLabel, convertFromBase } from "@/lib/units";
import Modal from "@/components/ui/Modal";

export default function StatusUpdateButtons({ intakeId, currentStatus, intake, buyers = [], allowedActions = {}, featureFlags }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const intakeMode = featureFlags?.intakeMode || "RECEIPT";
  const isPurchase = intakeMode === "PURCHASE";

  // Cancellation state
  const [showCancelNotesModal, setShowCancelNotesModal] = useState(false);
  const [cancelNotes, setCancelNotes] = useState("");

  // Form State
  const [unitRegistry, setUnitRegistry] = useState(null);
  const [buyerPartyId, setBuyerPartyId] = useState("");
  const [rate, setRate] = useState(intake?.rate || "");
  const [rateUnit, setRateUnit] = useState(intake?.rateUnit || "KG");
  const [bagCount, setBagCount] = useState(intake?.bagCount || "");
  const [bardanaGramPerBag, setBardanaGramPerBag] = useState("150");
  const isWeightRecorded = !!(intake?.isWeightRecorded && Number(intake?.grossWeight || 0) > 0);

  const [khotRate, setKhotRate] = useState("0");
  const [khotRateUnit, setKhotRateUnit] = useState("KG");
  const [isPartialSale, setIsPartialSale] = useState(false);
  const [soldQuantity, setSoldQuantity] = useState("");
  const [completingSalesTrackId, setCompletingSalesTrackId] = useState(null);
  const [grossWeightInput, setGrossWeightInput] = useState(
    isWeightRecorded ? (intake.grossWeight ? intake.grossWeight.toString() : "") : ""
  );
  const [grossWeightUnit, setGrossWeightUnit] = useState(intake?.unit || "KG");

  const maxRemaining = isWeightRecorded
    ? (intake?.remainingWeight !== null && intake?.remainingWeight !== undefined ? Number(intake.remainingWeight) : Number(intake?.grossWeight || 0))
    : (rateUnit === "BAG"
        ? Math.max(0, (intake?.bagCount || 0) - (intake?.salesTracks?.reduce((sum, t) => {
            if (!unitRegistry) return sum + Number(t.quantity || 0);
            return sum + convertFromBase(Number(t.quantity || 0), "BAG", intake?.product, unitRegistry);
          }, 0) || 0))
        : 99999999
      );

  const isBagProduct = intake?.unit === "BAG" || intake?.product?.category === "BAG" || intake?.product?.primaryUnit === "BAG";

  const categoryUnits = intake?.product && unitRegistry
    ? Object.values(unitRegistry.units).filter(u => u.unitCategoryCode === (intake.product.unitCategory || intake.product.category))
    : [];

  const isCommercialLocked = !isPurchase && (intake?.status === "SOLD" || intake?.status === "PARTIAL");

  React.useEffect(() => {
    if (!intake || intake.status === "PENDING" || intake.status === "PARTIAL") {
      setRateUnit(isBagProduct ? "BAG" : (intake?.product?.buyingRateUnit || "KG"));
      setKhotRateUnit(intake?.product?.primaryUnit || "KG");
      setGrossWeightUnit(intake?.unit || "KG");
    } else {
      setRateUnit(intake.rateUnit || (isBagProduct ? "BAG" : "KG"));
      setKhotRateUnit(intake.khotRateUnit || "KG");
      setGrossWeightUnit(intake.unit || "KG");
    }
  }, [intake, isBagProduct]);

  React.useEffect(() => {
    if (intake) {
      const remaining = isWeightRecorded
        ? (intake.remainingWeight !== null && intake.remainingWeight !== undefined ? Number(intake.remainingWeight) : Number(intake.grossWeight || 0))
        : (rateUnit === "BAG"
            ? Math.max(0, (intake.bagCount || 0) - (intake.salesTracks?.reduce((sum, t) => {
                if (!unitRegistry) return sum + Number(t.quantity || 0);
                return sum + convertFromBase(Number(t.quantity || 0), "BAG", intake.product, unitRegistry);
              }, 0) || 0))
            : 0
          );
      setSoldQuantity(remaining > 0 ? remaining.toString() : "");
    }
  }, [intake, isModalOpen, grossWeightInput, rateUnit, unitRegistry]);

  React.useEffect(() => {
    async function loadRegistry() {
      const res = await getUnitRegistryAction();
      if (res.success) {
        setUnitRegistry(res.data);
      }
    }
    loadRegistry();
  }, []);

  const intakeRef = React.useRef(intake);
  React.useEffect(() => {
    intakeRef.current = intake;
  }, [intake]);

  React.useEffect(() => {
    const handleOpen = (e) => {
      if (e?.detail?.salesTrackId) {
        setCompletingSalesTrackId(e.detail.salesTrackId);
        const track = intakeRef.current?.salesTracks?.find(t => t.id === e.detail.salesTrackId);
        if (track) {
          setBuyerPartyId(track.buyerPartyId ? track.buyerPartyId.toString() : "");
          setRate(track.buyingRate ? track.buyingRate.toString() : "");
          setRateUnit(track.rateUnit || "KG");
          setIsPartialSale(true);
          setSoldQuantity(track.quantity && Number(track.quantity) > 0 ? track.quantity.toString() : "");
          setGrossWeightUnit(intakeRef.current?.unit || "KG");
        }
      } else {
        setCompletingSalesTrackId(null);
      }
      setIsModalOpen(true);
    };
    window.addEventListener("open-sell-modal", handleOpen);
    return () => window.removeEventListener("open-sell-modal", handleOpen);
  }, []);

  const activeGrossWeight = isWeightRecorded
    ? (isPartialSale ? (Number(soldQuantity) || 0) : maxRemaining)
    : (Number(grossWeightInput) || 0);

  // Real-time calculation using core registry helper
  let grossWeightKg = 0, bardanaKg = 0, khotKg = 0, netWeightKg = 0, netWeight = 0;
  try {
    const calculated = calculateIntakeNetWeight({
      grossWeight: activeGrossWeight,
      unit: grossWeightUnit || "KG",
      bagCount: Number(bagCount) || 0,
      bardanaGramPerBag: Number(bardanaGramPerBag) || 0,
      khotRate: Number(khotRate) || 0,
      khotRateUnit: khotRateUnit,
      product: intake?.product,
      unitRegistry
    });
    grossWeightKg = calculated.grossWeightKg;
    bardanaKg = calculated.bardanaKg;
    khotKg = calculated.khotKg;
    netWeightKg = calculated.netWeightKg;
    netWeight = calculated.netWeight;
  } catch (err) {
    // Fail-safe fallback during initial render or until registry loads
  }

  // States for status reversion flow
  const [revertStatusTarget, setRevertStatusTarget] = useState(null);
  const [showUnbilledConfirmModal, setShowUnbilledConfirmModal] = useState(false);
  const [showBilledBlockModal, setShowBilledBlockModal] = useState(false);
  const [showSupplierBlockModal, setShowSupplierBlockModal] = useState(false);

  const salesTrack = intake?.salesTracks?.find(t => t.isBilled || t.saleTransactionId !== null) || intake?.salesTracks?.[0];
  const hasSalesTrack = intake?.salesTracks && intake.salesTracks.length > 0;
  const isBilled = intake?.salesTracks ? intake.salesTracks.some(t => t.isBilled || t.saleTransactionId !== null) : false;

  const supplierInvoiceItem = intake?.invoiceItems?.[0];
  const hasSupplierInvoice = !!supplierInvoiceItem;

  React.useEffect(() => {
    if (isModalOpen && intake && !isWeightRecorded && (intake.status === "SOLD" || intake.status === "PARTIAL") && salesTrack) {
      setBuyerPartyId(salesTrack.buyerPartyId ? salesTrack.buyerPartyId.toString() : "");
      setRate(salesTrack.buyingRate ? salesTrack.buyingRate.toString() : "");
      setRateUnit(salesTrack.rateUnit || "KG");
      setIsPartialSale(intake.status === "PARTIAL");
      setSoldQuantity(salesTrack.quantity ? salesTrack.quantity.toString() : "");
    }
  }, [isModalOpen, intake, salesTrack]);

  async function handleUpdate(status) {
    if (status === "SOLD") {
      setIsModalOpen(true);
      return;
    }

    // Check if we are reverting status away from SOLD, CLEARED, or PARTIAL to PENDING or CANCELLED
    if ((currentStatus === "SOLD" || currentStatus === "CLEARED" || currentStatus === "PARTIAL") && (status === "PENDING" || status === "CANCELLED")) {
      if (hasSupplierInvoice) {
        setShowSupplierBlockModal(true);
        return;
      }
      if (hasSalesTrack) {
        if (isBilled) {
          setShowBilledBlockModal(true);
          return;
        } else {
          setRevertStatusTarget(status);
          setShowUnbilledConfirmModal(true);
          return;
        }
      }
    }

    if (status === "CANCELLED" && allowedActions.rules?.requiresCancellationNotes) {
      setRevertStatusTarget(status);
      setShowCancelNotesModal(true);
      return;
    }

    setLoading(true);
    const result = await updateIntakeStatusAction(intakeId, status);
    setLoading(false);
    if (result?.error) {
      showToast.error(result.error);
    } else {
      showToast.success(`Status updated to ${status}`);
    }
  }

  async function submitCancellation() {
    if (allowedActions.rules?.requiresCancellationNotes && (!cancelNotes || cancelNotes.trim().length === 0)) {
      showToast.error("Cancellation notes are required");
      return;
    }
    setShowCancelNotesModal(false);
    setLoading(true);
    const result = await updateIntakeStatusAction(intakeId, "CANCELLED", cancelNotes);
    setLoading(false);
    setCancelNotes("");
    setRevertStatusTarget(null);

    if (result?.error) {
      showToast.error(result.error);
    } else {
      showToast.success("Status updated to CANCELLED");
    }
  }

  async function confirmRevertStatus() {
    setShowUnbilledConfirmModal(false);
    if (!revertStatusTarget) return;

    if (revertStatusTarget === "CANCELLED" && workflowSettings.requireCancellationNotes) {
      setShowCancelNotesModal(true);
      return;
    }

    setLoading(true);
    const result = await updateIntakeStatusAction(intakeId, revertStatusTarget);
    setLoading(false);
    setRevertStatusTarget(null);

    if (result?.error) {
      showToast.error(result.error);
    } else {
      showToast.success(`Status updated to ${revertStatusTarget}`);
    }
  }

  async function handleSellSubmit(e) {
    e.preventDefault();
    const isWeightRequired = intake?.status === "SOLD" || intake?.status === "PARTIAL";
    if (isWeightRequired && !isWeightRecorded && (!grossWeightInput || Number(grossWeightInput) <= 0)) {
      showToast.error("Please enter a valid gross weight to complete weighment.");
      return;
    }
    if (allowedActions.rules?.requiresBuyer && !buyerPartyId) {
      showToast.error("Please select a buyer");
      return;
    }
    if (!rate || Number(rate) <= 0) {
      showToast.error("Please enter a valid rate");
      return;
    }

    let soldVal = 0;
    if (isPartialSale) {
      if (soldQuantity && soldQuantity.trim() !== "") {
        soldVal = Number(soldQuantity);
        if (isNaN(soldVal) || soldVal <= 0) {
          showToast.error("Please enter a valid sold quantity");
          return;
        }
        if (soldVal > maxRemaining) {
          showToast.error(`Sold quantity cannot exceed remaining quantity (${maxRemaining})`);
          return;
        }
      } else {
        if (isWeightRecorded) {
          showToast.error("Please enter a valid sold quantity");
          return;
        }
        soldVal = 0;
      }
    }

    setLoading(true);
    const result = await sellIntakeAction(intakeId, {
      buyerPartyId: parseInt(buyerPartyId),
      rate: Number(rate),
      rateUnit,
      Bardana: bardanaKg,
      Khot: khotKg,
      netWeight: netWeight,
      isPartialSale,
      soldQuantity: isPartialSale ? soldVal : (isWeightRecorded ? maxRemaining : netWeight),
      salesTrackId: completingSalesTrackId,
      ...(!isWeightRecorded ? {
        grossWeight: Number(grossWeightInput) || 0,
        grossWeightUnit: grossWeightUnit,
        bagCount: Number(bagCount) || 0
      } : {})
    });

    if (result?.error) {
      showToast.error(result.error);
      setLoading(false);
    } else {
      showToast.success("Intake successfully sold!");
      handleCloseModal();
      setLoading(false);
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCompletingSalesTrackId(null);
    if (!isWeightRecorded && intake?.status !== "SOLD" && intake?.status !== "PARTIAL") {
      setBuyerPartyId("");
      setRate("");
      setRateUnit("KG");
      setIsPartialSale(false);
      setSoldQuantity("");
      setGrossWeightUnit(intake?.unit || "KG");
    }
  };

  return (
    <>
      <div className="space-y-2">
        <button
          onClick={() => handleUpdate("PENDING")}
          disabled={currentStatus === "PENDING" || loading}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
            currentStatus === "PENDING" 
              ? "bg-amber-50 text-amber-600 border border-amber-200 cursor-default font-medium" 
              : "hover:bg-accent border border-transparent"
          )}
        >
          <Clock className="h-4 w-4" />
          {isPurchase ? "Mark as Received" : "Mark as Pending"}
        </button>

        {!isPurchase && (
          <button
            onClick={() => handleUpdate("SOLD")}
            disabled={((currentStatus === "SOLD" && isWeightRecorded) || (currentStatus === "PARTIAL" && isWeightRecorded && Number(intake.remainingWeight) <= 0)) || loading}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
              (currentStatus === "SOLD" && isWeightRecorded)
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default font-medium" 
                : "hover:bg-accent border border-transparent"
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            {(currentStatus === "SOLD" || currentStatus === "PARTIAL") && !isWeightRecorded ? "Record Weight" : "Mark as Sold"}
          </button>
        )}

        <button
          onClick={() => handleUpdate("CLEARED")}
          disabled={currentStatus === "CLEARED" || !isWeightRecorded || loading}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
            currentStatus === "CLEARED" 
              ? "bg-blue-50 text-blue-600 border border-blue-200 cursor-default font-medium" 
              : (!isWeightRecorded ? "opacity-50 cursor-not-allowed bg-muted/20" : "hover:bg-accent border border-transparent")
          )}
          title={!isWeightRecorded ? "Weight must be recorded before clearing finance" : undefined}
        >
          <BadgeCheck className="h-4 w-4" />
          Mark as Cleared
        </button>

        <button
          onClick={() => handleUpdate("CANCELLED")}
          disabled={currentStatus === "CANCELLED" || loading}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
            currentStatus === "CANCELLED" 
              ? "bg-rose-50 text-rose-600 border border-rose-200 cursor-default font-medium" 
              : "hover:bg-accent border border-transparent"
          )}
        >
          <XCircle className="h-4 w-4" />
          Mark as Cancelled
        </button>
      </div>

      {/* SOLD Lifecycle Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b px-6 py-4 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {isWeightRecorded ? `Sell Intake ${intake?.intakeNumber}` : `Record Weight & Sell Intake ${intake?.intakeNumber}`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {isWeightRecorded ? "Complete billing tare & refraction fields" : "Enter gross weight and complete tare/refraction fields"}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSellSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Gross weight read-only summary or input */}
              {!isWeightRecorded ? (
                !isPartialSale && (
                  <div className="space-y-2 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-amber-600" /> Gross Weight {intake?.status === "PENDING" ? "(Optional)" : "(Required to Complete Weighment)"}
                    </label>
                    <div className="flex gap-2">
                      <input
                        required={intake?.status !== "PENDING"}
                        type="number"
                        step="0.01"
                        placeholder={intake?.status === "PENDING" ? "Leave empty if weight not yet recorded" : "Enter gross weight..."}
                        value={grossWeightInput}
                        onChange={e => {
                          setGrossWeightInput(e.target.value);
                          setSoldQuantity(""); // Keep soldQuantity optional/empty for full sale
                        }}
                        className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                      />
                      <select
                        value={grossWeightUnit}
                        onChange={e => setGrossWeightUnit(e.target.value)}
                        className="bg-muted border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-bold uppercase font-mono cursor-pointer"
                      >
                        {categoryUnits.map(u => (
                          <option key={u.code} value={u.code}>{u.code}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-primary/5 p-4 rounded-xl flex items-center justify-between border border-primary/10">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Gross Quantity</span>
                    <div className="text-xl font-black text-primary">
                      {intake?.unit === "BAG" ? (
                        <>
                          {Number(grossWeightKg).toLocaleString()} <span className="text-xs font-normal uppercase">KG</span>
                        </>
                      ) : (
                        <>
                          {Number(intake?.grossWeight).toLocaleString()} <span className="text-xs font-normal uppercase">{getUnitLabel(intake?.unit)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Scale className="h-8 w-8 text-primary/30" />
                </div>
              )}

              {/* Buyer selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Buyer
                </label>
                <select
                  required={allowedActions.rules?.requiresBuyer}
                  disabled={isCommercialLocked}
                  value={buyerPartyId}
                  onChange={e => setBuyerPartyId(e.target.value)}
                  className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium disabled:opacity-75 disabled:bg-muted/30"
                >
                  <option value="">Select Buyer...</option>
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.phoneNumber})</option>
                  ))}
                </select>
              </div>

              {/* Optional Partial Sale Toggle / Weight Card */}
              {(isPartialSale || (intake?.status === "PENDING" && allowedActions.rules?.supportsPartialSell)) && (
                <div className="bg-muted/30 p-4 rounded-xl border border-border/60 space-y-4">
                  {intake?.status === "PENDING" && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-sm font-bold text-foreground">Partial Sale</label>
                        <p className="text-xs text-muted-foreground">Sell a fraction of the remaining intake</p>
                      </div>
                      <input
                        type="checkbox"
                        disabled={isCommercialLocked}
                        checked={isPartialSale}
                        onChange={(e) => {
                          setIsPartialSale(e.target.checked);
                          if (!e.target.checked) {
                            setSoldQuantity(isWeightRecorded ? maxRemaining.toString() : "");
                            setGrossWeightInput("");
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer animate-none disabled:opacity-75"
                      />
                    </div>
                  )}

                  {isPartialSale && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                          <Scale className="h-3.5 w-3.5" /> {isWeightRecorded ? `Sold Quantity (${intake?.unit || "KG"})` : `Gross Weight`}
                        </label>
                        {isWeightRecorded && maxRemaining < 99999999 && (
                          <span className="text-[10px] font-semibold text-amber-600 font-mono">
                            Max Available: {maxRemaining.toLocaleString()} {intake?.unit || "KG"}
                          </span>
                        )}
                      </div>
                      
                      {isWeightRecorded ? (
                        <div className="flex gap-2">
                          <input
                            required
                            disabled={isCommercialLocked}
                            type="number"
                            step="0.01"
                            placeholder={`Enter quantity in ${intake?.unit || "KG"}...`}
                            value={soldQuantity}
                            onChange={e => setSoldQuantity(e.target.value)}
                            {...(maxRemaining < 99999999 ? { max: maxRemaining } : {})}
                            min={0.01}
                            className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono disabled:opacity-75 disabled:bg-muted/30"
                          />
                          <span className="flex items-center px-3 bg-muted border rounded-lg text-sm text-muted-foreground font-bold uppercase font-mono">
                            {getUnitLabel(intake?.unit)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            required
                            disabled={isWeightRecorded}
                            type="number"
                            step="0.01"
                            placeholder={`Enter gross weight...`}
                            value={grossWeightInput}
                            onChange={e => {
                              setGrossWeightInput(e.target.value);
                              setSoldQuantity(e.target.value);
                            }}
                            min={0.01}
                            className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono disabled:opacity-75 disabled:bg-muted/30"
                          />
                          <select
                            value={grossWeightUnit}
                            onChange={e => setGrossWeightUnit(e.target.value)}
                            className="bg-muted border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold uppercase font-mono cursor-pointer"
                          >
                            {categoryUnits.map(u => (
                              <option key={u.code} value={u.code}>{u.code}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Selling Rate */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Rate
                  </label>
                  <input
                    required
                    disabled={isCommercialLocked}
                    type="number"
                    step="0.01"
                    placeholder="Rate..."
                    value={rate}
                    onChange={e => setRate(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono disabled:opacity-75 disabled:bg-muted/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Unit</label>
                  <select
                    disabled={isWeightRecorded}
                    value={rateUnit}
                    onChange={e => setRateUnit(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium disabled:opacity-75 disabled:bg-muted/30"
                  >
                    {isBagProduct ? (
                      <option value="BAG">/ Bag</option>
                    ) : (
                      categoryUnits.map(u => (
                        <option key={u.code} value={u.code}>/ {u.code}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Bardana Inputs */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Box className="h-3.5 w-3.5 text-amber-600" /> Bardana Calculation (Tare)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">No. of Bags</label>
                    <input
                      type="number"
                      placeholder="Bags..."
                      value={bagCount}
                      onChange={e => setBagCount(e.target.value)}
                      className="w-full bg-background border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Weight (Grams/Bag)</label>
                    <input
                      type="number"
                      placeholder="Grams..."
                      value={bardanaGramPerBag}
                      onChange={e => setBardanaGramPerBag(e.target.value)}
                      className="w-full bg-background border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg flex justify-between font-mono">
                  <span>Computed Bardana:</span>
                  <span className="font-semibold text-foreground">{bardanaKg.toFixed(2)} KG</span>
                </div>
              </div>

              {/* Khot Inputs */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Scale className="h-3.5 w-3.5 text-rose-600" /> Khot Calculation (Impurity/Deduction)
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Refraction (Grams)</label>
                    <input
                      type="number"
                      placeholder="Grams..."
                      value={khotRate}
                      onChange={e => setKhotRate(e.target.value)}
                      className="w-full bg-background border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Per Unit</label>
                    <select
                      disabled={isWeightRecorded}
                      value={khotRateUnit}
                      onChange={e => setKhotRateUnit(e.target.value)}
                      className="w-full bg-background border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium disabled:opacity-75 disabled:bg-muted/30"
                    >
                      {categoryUnits.map(u => (
                        <option key={u.code} value={u.code}>/ {u.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg flex justify-between font-mono">
                  <span>Computed Khot:</span>
                  <span className="font-semibold text-foreground">{khotKg.toFixed(2)} KG</span>
                </div>
              </div>

              {/* Live Net Weight Display */}
              <div className="bg-emerald-50 border border-emerald-200/50 p-4 rounded-xl flex items-center justify-between mt-4">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">Calculated Net Weight</span>
                  <div className="text-2xl font-black text-emerald-700 font-mono">
                    {intake?.unit === "BAG" ? (
                      <>
                        {netWeightKg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs font-normal uppercase ml-1 italic">KG</span>
                      </>
                    ) : (
                      <>
                        {netWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs font-normal uppercase ml-1 italic">{getUnitLabel(intake?.unit)}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                  <Scale className="h-6 w-6 animate-pulse" />
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 bg-muted/20 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSellSubmit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {isWeightRecorded 
                  ? "Save & Sold" 
                  : (intake?.status === "PENDING" 
                      ? (grossWeightInput && Number(grossWeightInput) > 0 ? "Save & Complete" : "Save & Complete Later")
                      : "Save & Complete"
                    )
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unbilled Status Revert Confirmation Modal */}
      <Modal
        isOpen={showUnbilledConfirmModal}
        onClose={() => {
          setShowUnbilledConfirmModal(false);
          setRevertStatusTarget(null);
        }}
        title="Revert Intake Status"
        description="Reverting will remove sales trace"
        type="warning"
        confirmLabel="Confirm Revert"
        onConfirm={confirmRevertStatus}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Reverting this intake&apos;s status to <span className="font-bold text-foreground">{revertStatusTarget}</span> will have the following operational consequences:
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
              <div className="font-semibold text-foreground">{Number(salesTrack?.quantity || 0).toLocaleString()} {intake?.unit}</div>
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
              <div>Settlement Status:</div>
              <div className="font-semibold text-rose-700 dark:text-rose-400">{supplierInvoiceItem?.invoice?.status || "COMPLETED"}</div>
            </div>
          </div>

          <div className="bg-rose-50 dark:bg-rose-950/20 p-3.5 rounded-lg border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 leading-normal">
            <strong>How to resolve:</strong> You must first edit or delete the associated Supplier Invoice <strong>{supplierInvoiceItem?.invoice?.invoiceNumber || ""}</strong> in the Supplier Invoices module to exclude this intake before you can revert its status here.
          </div>
        </div>
      </Modal>

      {/* Cancellation Notes Prompt Modal */}
      <Modal
        isOpen={showCancelNotesModal}
        onClose={() => {
          setShowCancelNotesModal(false);
          setCancelNotes("");
          setRevertStatusTarget(null);
        }}
        title="Reason for Cancellation"
        description="Cancellation notes are required"
        type="warning"
        confirmLabel="Confirm Cancellation"
        onConfirm={submitCancellation}
      >
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Please provide a brief reason for cancelling this intake transaction.
          </p>
          <textarea
            required
            rows={3}
            placeholder="Enter reason..."
            value={cancelNotes}
            onChange={(e) => setCancelNotes(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          />
        </div>
      </Modal>
    </>
  );
}
