"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Package, 
  Wallet, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Loader2, 
  Plus, 
  Trash2, 
  X, 
  ReceiptText 
} from "lucide-react";
import { getUninvoicedDataAction, generateSupplierInvoiceAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import { calculateSupplierDeductions } from "@/lib/financial";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ADJUSTMENT_TYPES_SUPPLIER } from "@/lib/constants";

export default function InvoiceGenerator({ suppliers }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedParty, setSelectedParty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ intakes: [], advances: [] });
  const [selectedIntakes, setSelectedIntakes] = useState([]);
  const [selectedAdvances, setSelectedAdvances] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-intake adjustments state: { [intakeId]: [adjustments] }
  const [adjustmentsByIntake, setAdjustmentsByIntake] = useState({});
  const [activeIntakeForAdjustment, setActiveIntakeForAdjustment] = useState(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [currentAdjustment, setCurrentAdjustment] = useState({
    adjustmentType: ADJUSTMENT_TYPES_SUPPLIER[0] || "Labour",
    method: "PERCENTAGE",
    direction: "SUBTRACT",
    value: "",
    unit: "KG"
  });

  // Fetch data when party is selected
  useEffect(() => {
    if (selectedParty) {
      fetchData(selectedParty.id);
    }
  }, [selectedParty]);

  const fetchData = async (partyId) => {
    setLoading(true);
    const result = await getUninvoicedDataAction(partyId);
    if (result.success) {
      setData(result.data);
      setSelectedIntakes(result.data.intakes.map(i => i.id));
      setSelectedAdvances(result.data.advances.map(a => a.id));
      setAdjustmentsByIntake({}); // Reset on party change
    } else {
      toast.error("Failed to load data: " + result.error);
    }
    setLoading(false);
  };

  const handleToggleIntake = (id) => {
    setSelectedIntakes(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleToggleAdvance = (id) => {
    setSelectedAdvances(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const addAdjustment = () => {
    if (!currentAdjustment.value || isNaN(currentAdjustment.value) || parseFloat(currentAdjustment.value) <= 0) {
      toast.error("Please enter a valid positive numeric value");
      return;
    }
    if (!activeIntakeForAdjustment) return;

    setAdjustmentsByIntake(prev => {
      const currentList = prev[activeIntakeForAdjustment] || [];
      return {
        ...prev,
        [activeIntakeForAdjustment]: [
          ...currentList,
          {
            adjustmentType: currentAdjustment.adjustmentType,
            method: currentAdjustment.method,
            value: parseFloat(currentAdjustment.value),
            direction: currentAdjustment.direction,
            unit: currentAdjustment.method === "PER_WEIGHT" ? currentAdjustment.unit : null
          }
        ]
      };
    });

    setIsAdjustmentModalOpen(false);
    setActiveIntakeForAdjustment(null);
    setCurrentAdjustment({
      adjustmentType: ADJUSTMENT_TYPES_SUPPLIER[0] || "Labour",
      method: "PERCENTAGE",
      direction: "SUBTRACT",
      value: "",
      unit: "KG"
    });
  };

  const removeAdjustment = (intakeId, index) => {
    setAdjustmentsByIntake(prev => {
      const currentList = prev[intakeId] || [];
      return {
        ...prev,
        [intakeId]: currentList.filter((_, i) => i !== index)
      };
    });
  };

  // Calculations
  const activeIntakes = data.intakes.filter(i => selectedIntakes.includes(i.id));
  const activeAdvances = data.advances.filter(a => selectedAdvances.includes(a.id));

  // Map local adjustmentsByIntake into active intakes object array
  const intakesWithAdjustments = activeIntakes.map(intake => ({
    ...intake,
    adjustments: adjustmentsByIntake[intake.id] || []
  }));

  const { totalGrossValue, totalDeductions, netValue, intakeBreakdowns } = calculateSupplierDeductions(intakesWithAdjustments);
  const totalAdvances = activeAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
  const finalPayable = netValue - totalAdvances;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("partyId", selectedParty.id);
    formData.append("intakeIds", JSON.stringify(selectedIntakes));
    formData.append("advanceIds", JSON.stringify(selectedAdvances));
    formData.append("adjustmentsByIntake", JSON.stringify(adjustmentsByIntake));

    const result = await generateSupplierInvoiceAction(formData);
    if (result.success) {
      toast.success("Invoice generated successfully!");
      router.push(`/supplier-invoices/${result.data.id}`);
    } else {
      toast.error(result.error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        <div className={cn("flex items-center gap-2", step >= 1 && "text-primary")}>
          <span className={cn("h-6 w-6 rounded-full border flex items-center justify-center", step === 1 && "border-primary")}>1</span>
          Select Party
        </div>
        <div className="h-px w-8 bg-border" />
        <div className={cn("flex items-center gap-2", step >= 2 && "text-primary")}>
          <span className={cn("h-6 w-6 rounded-full border flex items-center justify-center", step === 2 && "border-primary")}>2</span>
          Selections
        </div>
        <div className="h-px w-8 bg-border" />
        <div className={cn("flex items-center gap-2", step >= 3 && "text-primary")}>
          <span className={cn("h-6 w-6 rounded-full border flex items-center justify-center", step === 3 && "border-primary")}>3</span>
          Preview
        </div>
      </div>

      {/* Step 1: Select Party */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedParty(s); setStep(2); }}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <User className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <div>
                <div className="font-bold">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.phoneNumber}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Selections */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> 
              Uninvoiced Intakes
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data.intakes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground italic border rounded-xl bg-muted/20">
              No pending intakes found for this supplier.
            </div>
          ) : (
            <div className="grid gap-3">
              {data.intakes.map(i => (
                <div 
                  key={i.id}
                  onClick={() => handleToggleIntake(i.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                    selectedIntakes.includes(i.id) ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                    selectedIntakes.includes(i.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {selectedIntakes.includes(i.id) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-xs font-bold text-primary">{i.intakeNumber}</div>
                    <div className="font-medium">{i.product.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{Number(i.grossWeight)} {i.unit || "KG"}</div>
                    <div className="text-xs text-muted-foreground">Rs. {Number(i.rate)} / {i.rateUnit === "MAUND" ? "Maund" : (i.rateUnit || "KG")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-6 border-t">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" /> 
              Unlinked Advances
            </h2>
          </div>

          {data.advances.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground italic border rounded-xl bg-muted/20">
              No unlinked advances found.
            </div>
          ) : (
            <div className="grid gap-3">
              {data.advances.map(a => (
                <div 
                  key={a.id}
                  onClick={() => handleToggleAdvance(a.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                    selectedAdvances.includes(a.id) ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                    selectedAdvances.includes(a.id) ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {selectedAdvances.includes(a.id) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Advance Payment</div>
                    <div className="text-xs text-muted-foreground">{a.notes || "No notes"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-emerald-600">Rs. {Number(a.amount).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-6">
            <button onClick={() => setStep(1)} className="px-6 py-2 rounded-lg border hover:bg-muted transition-colors font-medium">Back</button>
            <button 
              disabled={selectedIntakes.length === 0}
              onClick={() => setStep(3)} 
              className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
            >
              Continue to Preview
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Columns: Selected Items & Breakdowns */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-muted/30 border-b flex items-center justify-between">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Selected Intakes & Per-Intake Breakdowns
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {activeIntakes.map(intake => {
                  const breakdown = intakeBreakdowns.find(b => b.intakeId === intake.id) || {
                    gross: 0,
                    deductions: 0,
                    net: 0,
                    adjustments: []
                  };
                  const weight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
                  return (
                    <div key={intake.id} className="p-4 border rounded-xl space-y-4 bg-muted/10 relative group/card">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {intake.intakeNumber}
                          </span>
                          <h4 className="font-bold text-sm mt-1">{intake.product.name}</h4>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {intake.bagCount ? `${intake.bagCount} Bags • ` : ""}{weight} {intake.unit || "KG"} @ Rs. {Number(intake.rate)}/{intake.rateUnit === "MAUND" ? "Maund" : (intake.rateUnit || "KG")}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block font-medium">Gross Amount</span>
                          <span className="font-bold text-sm">Rs. {breakdown.gross.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Per-Intake Adjustments Manager */}
                      <div className="border-t border-dashed pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Adjustments / Deductions</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveIntakeForAdjustment(intake.id);
                              setCurrentAdjustment(prev => ({
                                ...prev,
                                unit: intake.unit || "KG"
                              }));
                              setIsAdjustmentModalOpen(true);
                            }}
                            className="text-[10px] font-bold border border-primary/30 text-primary px-2 py-1 rounded hover:bg-primary/5 transition-colors flex items-center gap-0.5"
                          >
                            <Plus className="h-2.5 w-2.5" />
                            Add
                          </button>
                        </div>

                        {breakdown.adjustments && breakdown.adjustments.length > 0 ? (
                          <div className="space-y-1.5">
                            {breakdown.adjustments.map((adj, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs bg-card border rounded-lg px-3 py-1.5 group/item">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-muted-foreground">
                                    {adj.adjustmentType}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground/60 uppercase">
                                    {adj.method === "PERCENTAGE" ? `${adj.value}%` : adj.method === "PER_WEIGHT" ? `Rs. ${adj.value}/${adj.unit || "KG"}` : `Fixed Rs. ${adj.value}`}
                                    {" • "}
                                    <span className={adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"}>
                                      {adj.direction}
                                    </span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "font-mono font-bold",
                                    adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"
                                  )}>
                                    {adj.direction === "ADD" ? "+" : "-"} Rs. {adj.calculatedAmount.toLocaleString()}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeAdjustment(intake.id, idx)}
                                    className="text-muted-foreground hover:text-rose-600 transition-colors p-0.5"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground italic text-center py-2 border border-dashed rounded-lg opacity-60 bg-muted/5">
                            No adjustments applied to this intake.
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-3 flex justify-between items-center bg-primary/5 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                        <span className="text-xs font-bold text-primary">Net Intake Value</span>
                        <span className="font-black text-sm text-primary">Rs. {breakdown.net.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {activeAdvances.length > 0 && (
              <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-muted/30 border-b">
                  <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Advances to Deduct
                  </h3>
                </div>
                <div className="p-6 divide-y divide-border">
                  {activeAdvances.map(adv => (
                    <div key={adv.id} className="flex justify-between items-center py-2 first:pt-0 last:pb-0">
                      <div>
                        <div className="text-sm font-bold">Advance Payment</div>
                        <div className="text-xs text-muted-foreground">{adv.notes || "No notes"}</div>
                      </div>
                      <div className="font-mono font-bold text-sm text-rose-600">- Rs. {Number(adv.amount).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Columns: Billing Summary */}
          <div className="space-y-6">
            {/* Financial Summary Card */}
            <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-xl shadow-primary/10 space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b border-white/20 pb-4">
                <ReceiptText className="h-5 w-5" />
                Settlement Summary
              </h3>
              
              <div className="space-y-3 font-medium text-sm">
                <div className="flex justify-between items-center">
                  <span className="opacity-80">Total Intakes</span>
                  <span>{activeIntakes.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-80">Base Amount</span>
                  <span>Rs. {totalGrossValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-80">Total Adjustments</span>
                  <span className="text-rose-200">- Rs. {totalDeductions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-2 font-bold text-base">
                  <span>Net Amount</span>
                  <span>Rs. {netValue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="opacity-80">Less: Total Advances</span>
                  <span className="text-rose-200">- Rs. {totalAdvances.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-end border-t border-white/20 pt-4">
                  <span className="font-bold text-xs uppercase opacity-75">Final Total</span>
                  <div className="text-right">
                    <span className="text-2xl font-black">Rs. {finalPayable.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setStep(2)} 
                  className="flex-1 bg-white/10 hover:bg-white/25 border border-white/10 text-white py-3 rounded-xl font-bold text-sm transition-all text-center"
                >
                  Back
                </button>
                <button 
                  disabled={isSubmitting}
                  onClick={handleSubmit} 
                  className="flex-[2] bg-white text-primary hover:bg-white/95 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : "Confirm & Save"}
                </button>
              </div>
            </div>
          </div>

          {/* Adjustment Modal */}
          {isAdjustmentModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-card border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/50">
                  <h3 className="font-bold text-card-foreground">Add Billing Adjustment</h3>
                  <button onClick={() => { setIsAdjustmentModalOpen(false); setActiveIntakeForAdjustment(null); }} className="p-1 hover:bg-muted rounded-full transition-colors">
                    <X className="h-5 w-5 text-card-foreground" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Type</label>
                    <select 
                      value={currentAdjustment.adjustmentType}
                      onChange={e => setCurrentAdjustment({...currentAdjustment, adjustmentType: e.target.value})}
                      className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-card-foreground"
                    >
                      {ADJUSTMENT_TYPES_SUPPLIER.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Method</label>
                      <select 
                        value={currentAdjustment.method}
                        onChange={e => {
                          const method = e.target.value;
                          const defaultUnit = method === "PER_WEIGHT"
                            ? (data.intakes.find(i => i.id === activeIntakeForAdjustment)?.unit || "KG")
                            : "KG";
                          setCurrentAdjustment({
                            ...currentAdjustment,
                            method,
                            unit: defaultUnit
                          });
                        }}
                        className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-card-foreground"
                      >
                        <option value="PERCENTAGE">% Percentage</option>
                        <option value="FIXED">Fixed Amount</option>
                        <option value="PER_WEIGHT">Per Weight</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Direction</label>
                      <select 
                        value={currentAdjustment.direction}
                        onChange={e => setCurrentAdjustment({...currentAdjustment, direction: e.target.value})}
                        className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-card-foreground"
                      >
                        <option value="SUBTRACT">Subtract (-)</option>
                        <option value="ADD">Add (+)</option>
                      </select>
                    </div>
                  </div>

                  {currentAdjustment.method === "PER_WEIGHT" && (
                    <div className="space-y-2 animate-in slide-in-from-top duration-100">
                      <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Weight Unit</label>
                      <select 
                        value={currentAdjustment.unit}
                        onChange={e => setCurrentAdjustment({...currentAdjustment, unit: e.target.value})}
                        className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-card-foreground"
                      >
                        <option value="KG">KG</option>
                        <option value="MAUND">Maund</option>
                        <option value="BAG">Bag</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Value</label>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={currentAdjustment.value}
                      onChange={e => setCurrentAdjustment({...currentAdjustment, value: e.target.value})}
                      className="w-full bg-background border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-lg text-card-foreground"
                      autoFocus
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addAdjustment}
                    className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold mt-4 hover:opacity-90 transition-opacity"
                  >
                    Add to Intake
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
