"use client";

import React, { useState } from "react";
import { updateIntakeStatusAction, sellIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { showToast } from "@/components/ui/Toast";
import { Clock, BadgeCheck, ShoppingBag, XCircle, X, Scale, User, DollarSign, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateIntakeNetWeight } from "@/lib/units";
import { getPreferredRateUnit, getPreferredWeightUnit } from "@/lib/display-units";
import Modal from "@/components/ui/Modal";

export default function StatusUpdateButtons({ intakeId, currentStatus, intake, buyers = [] }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [buyerPartyId, setBuyerPartyId] = useState("");
  const [rate, setRate] = useState(intake?.rate || "");
  const [rateUnit, setRateUnit] = useState(intake?.rateUnit || "KG");
  const [bagCount, setBagCount] = useState(intake?.bagCount || "");
  const [bardanaGramPerBag, setBardanaGramPerBag] = useState("150");
  const [khotRate, setKhotRate] = useState("0");
  const [khotRateUnit, setKhotRateUnit] = useState("KG");
  const [isPartialSale, setIsPartialSale] = useState(false);
  const [soldQuantity, setSoldQuantity] = useState("");

  const maxRemaining = intake?.remainingWeight !== null && intake?.remainingWeight !== undefined 
    ? Number(intake.remainingWeight) 
    : Number(intake?.grossWeight || 0);

  React.useEffect(() => {
    if (!intake || intake.status === "PENDING" || intake.status === "PARTIAL") {
      setRateUnit(getPreferredRateUnit());
      setKhotRateUnit(getPreferredWeightUnit());
    } else {
      setRateUnit(intake.rateUnit || "KG");
      setKhotRateUnit(intake.khotRateUnit || "KG");
    }
  }, [intake]);

  React.useEffect(() => {
    if (intake) {
      const remaining = intake.remainingWeight !== null && intake.remainingWeight !== undefined ? Number(intake.remainingWeight) : Number(intake.grossWeight || 0);
      setSoldQuantity(remaining.toString());
    }
  }, [intake, isModalOpen]);

  const activeGrossWeight = isPartialSale ? (Number(soldQuantity) || 0) : maxRemaining;

  // Real-time calculation using core registry helper
  const { grossWeightKg, bardanaKg, khotKg, netWeightKg, netWeight } = calculateIntakeNetWeight({
    grossWeight: activeGrossWeight,
    unit: intake?.unit || "KG",
    bagCount: Number(bagCount) || 0,
    bardanaGramPerBag: Number(bardanaGramPerBag) || 0,
    khotRate: Number(khotRate) || 0,
    khotRateUnit: khotRateUnit,
    product: intake?.product
  });

  // States for status reversion flow
  const [revertStatusTarget, setRevertStatusTarget] = useState(null);
  const [showUnbilledConfirmModal, setShowUnbilledConfirmModal] = useState(false);
  const [showBilledBlockModal, setShowBilledBlockModal] = useState(false);
  const [showSupplierBlockModal, setShowSupplierBlockModal] = useState(false);

  const salesTrack = intake?.salesTracks?.[0];
  const hasSalesTrack = !!salesTrack;
  const isBilled = salesTrack ? (salesTrack.isBilled || salesTrack.saleTransactionId !== null) : false;

  const supplierInvoiceItem = intake?.invoiceItems?.[0];
  const hasSupplierInvoice = !!supplierInvoiceItem;

  async function handleUpdate(status) {
    if (status === "SOLD") {
      setIsModalOpen(true);
      return;
    }

    // Check if we are reverting status away from SOLD or CLEARED to PENDING or CANCELLED
    if ((currentStatus === "SOLD" || currentStatus === "CLEARED") && (status === "PENDING" || status === "CANCELLED")) {
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

    setLoading(true);
    const result = await updateIntakeStatusAction(intakeId, status);
    setLoading(false);
    if (result?.error) {
      showToast.error(result.error);
    } else {
      showToast.success(`Status updated to ${status}`);
    }
  }

  async function confirmRevertStatus() {
    setShowUnbilledConfirmModal(false);
    if (!revertStatusTarget) return;

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
    if (!buyerPartyId) {
      showToast.error("Please select a buyer");
      return;
    }
    if (!rate || Number(rate) <= 0) {
      showToast.error("Please enter a valid rate");
      return;
    }

    if (isPartialSale) {
      const soldVal = Number(soldQuantity);
      if (isNaN(soldVal) || soldVal <= 0) {
        showToast.error("Please enter a valid sold quantity");
        return;
      }
      if (soldVal > maxRemaining) {
        showToast.error(`Sold quantity cannot exceed remaining weight (${maxRemaining})`);
        return;
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
      soldQuantity: isPartialSale ? Number(soldQuantity) : maxRemaining
    });
    setLoading(true);

    if (result?.error) {
      showToast.error(result.error);
      setLoading(false);
    } else {
      showToast.success("Intake successfully sold!");
      setIsModalOpen(false);
      setLoading(false);
    }
  }

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
          Mark as Pending
        </button>

        <button
          onClick={() => handleUpdate("SOLD")}
          disabled={currentStatus === "SOLD" || loading}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
            currentStatus === "SOLD" 
              ? "bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default font-medium" 
              : "hover:bg-accent border border-transparent"
          )}
        >
          <ShoppingBag className="h-4 w-4" />
          Mark as Sold
        </button>

        <button
          onClick={() => handleUpdate("CLEARED")}
          disabled={currentStatus === "CLEARED" || loading}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors",
            currentStatus === "CLEARED" 
              ? "bg-blue-50 text-blue-600 border border-blue-200 cursor-default font-medium" 
              : "hover:bg-accent border border-transparent"
          )}
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
                  <h3 className="font-bold text-base">Sell Intake {intake?.intakeNumber}</h3>
                  <p className="text-xs text-muted-foreground">Complete billing tare & refraction fields</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-accent rounded-full transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSellSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Gross weight read-only summary */}
              <div className="bg-primary/5 p-4 rounded-xl flex items-center justify-between border border-primary/10">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Gross Weight</span>
                  <div className="text-xl font-black text-primary">
                    {intake?.unit === "BAG" ? (
                      <>
                        {Number(grossWeightKg).toLocaleString()} <span className="text-xs font-normal uppercase">KG</span>
                      </>
                    ) : (
                      <>
                        {Number(intake?.grossWeight).toLocaleString()} <span className="text-xs font-normal uppercase">{intake?.unit === "MAUND" ? "MND" : intake?.unit}</span>
                      </>
                    )}
                  </div>
                </div>
                <Scale className="h-8 w-8 text-primary/30" />
              </div>

              {/* Buyer selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Buyer
                </label>
                <select
                  required
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

              {/* Optional Partial Sale Toggle */}
              <div className="bg-muted/30 p-4 rounded-xl border border-border/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-bold text-foreground">Partial Sale</label>
                    <p className="text-xs text-muted-foreground">Sell a fraction of the remaining intake</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isPartialSale}
                    onChange={(e) => {
                      setIsPartialSale(e.target.checked);
                      if (!e.target.checked) {
                        setSoldQuantity(maxRemaining.toString());
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer animate-none"
                  />
                </div>

                {isPartialSale && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5" /> Sold Quantity ({intake?.unit})
                      </label>
                      <span className="text-[10px] font-semibold text-amber-600 font-mono">
                        Max Available: {maxRemaining.toLocaleString()} {intake?.unit}
                      </span>
                    </div>
                    <input
                      required
                      type="number"
                      step="0.01"
                      placeholder={`Enter weight in ${intake?.unit}...`}
                      value={soldQuantity}
                      onChange={e => setSoldQuantity(e.target.value)}
                      max={maxRemaining}
                      min={0.01}
                      className="w-full bg-background border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Selling Rate */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5" /> Rate
                  </label>
                  <input
                    required
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
                    <option value="KG">/ KG</option>
                    <option value="MAUND">/ Maund</option>
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
                      value={khotRateUnit}
                      onChange={e => setKhotRateUnit(e.target.value)}
                      className="w-full bg-background border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 font-medium"
                    >
                      <option value="KG">/ KG</option>
                      <option value="MAUND">/ Maund</option>
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
                        <span className="text-xs font-normal uppercase ml-1 italic">{intake?.unit === "MAUND" ? "MND" : intake?.unit}</span>
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
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSellSubmit}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                Save sold state
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
            <li className="flex items-start gap-2">
              <span className="text-amber-600 font-bold">•</span>
              <span><strong>Restore Inventory</strong>: The quantity ({Number(intake?.normalizedWeight || 0).toLocaleString()} KG) will be returned to inventory.</span>
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
    </>
  );
}
