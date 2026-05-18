"use client";

import React, { useState } from "react";
import { updateIntakeAction } from "@/modules/intake/controllers/intakeActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUnitsByCategory, calculateIntakeNetWeight } from "@/lib/units";
import { Scale, User, DollarSign, Box } from "lucide-react";

export default function EditIntakeForm({ intake, suppliers, products, buyers = [] }) {
  const router = useRouter();

  // Controlled States
  const [selectedProductId, setSelectedProductId] = useState(intake.productId.toString());
  const [grossWeight, setGrossWeight] = useState(intake.grossWeight || "");
  const [unit, setUnit] = useState(intake.unit || "KG");
  const [bagCount, setBagCount] = useState(intake.bagCount || "");
  const [status, setStatus] = useState(intake.status || "PENDING");
  const [notes, setNotes] = useState(intake.notes || "");

  // SOLD calculations states
  const [buyerPartyId, setBuyerPartyId] = useState(intake.salesTracks?.[0]?.buyerPartyId?.toString() || "");
  const [rate, setRate] = useState(intake.rate || "");
  const [rateUnit, setRateUnit] = useState("KG");
  const [bardanaGramPerBag, setBardanaGramPerBag] = useState(
    intake.Bardana && intake.bagCount ? Math.round((Number(intake.Bardana) * 1000) / Number(intake.bagCount)).toString() : "150"
  );
  const [khotRate, setKhotRate] = useState("0");
  const [khotRateUnit, setKhotRateUnit] = useState("KG");

  // Real-time calculation logic
  const { grossWeightKg, bardanaKg, khotKg, netWeight } = calculateIntakeNetWeight({
    grossWeight: Number(grossWeight) || 0,
    unit: unit,
    bagCount: Number(bagCount) || 0,
    bardanaGramPerBag: Number(bardanaGramPerBag) || 0,
    khotRate: Number(khotRate) || 0,
    khotRateUnit: khotRateUnit
  });

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));
  const compatibleUnits = selectedProduct ? getUnitsByCategory(selectedProduct.category) : [];

  async function handleSubmit(formData) {
    // Inject calculated net values into the FormData object prior to submission
    formData.set("partyId", formData.get("partyId"));
    formData.set("productId", selectedProductId);
    formData.set("unit", unit);
    formData.set("grossWeight", grossWeight);
    formData.set("bagCount", bagCount);
    formData.set("status", status);
    formData.set("notes", notes);

    if (status === "SOLD") {
      if (!buyerPartyId) {
        toast.error("Please select a buyer Party");
        return;
      }
      if (!rate || Number(rate) <= 0) {
        toast.error("Please specify a valid Rate");
        return;
      }
      formData.set("buyerPartyId", buyerPartyId);
      formData.set("rate", rate.toString());
      formData.set("Bardana", bardanaKg.toString());
      formData.set("Khot", khotKg.toString());
      formData.set("netWeight", netWeight.toString());
    }

    const result = await updateIntakeAction(intake.id, formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Intake updated successfully");
      router.push(`/intake/${intake.id}`);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
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
            onChange={(e) => setSelectedProductId(e.target.value)}
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
            onChange={e => setUnit(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
          >
            {compatibleUnits.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.id})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="grossWeight" className="text-sm font-medium">Gross Weight</label>
          <input
            id="grossWeight"
            type="number"
            step="0.01"
            required
            value={grossWeight}
            onChange={e => setGrossWeight(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="bagCount" className="text-sm font-medium">Bag Count (Optional)</label>
          <input
            id="bagCount"
            type="number"
            value={bagCount}
            onChange={e => setBagCount(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
                  <option value="KG">/ KG</option>
                  <option value="MAUND">/ Maund</option>
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
                    <option value="KG">/ KG</option>
                    <option value="MAUND">/ Maund</option>
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
                {netWeight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="text-xs font-normal uppercase ml-1 italic">{unit === "MAUND" ? "MND" : unit}</span>
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
          className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm hover:bg-primary/90 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
}
