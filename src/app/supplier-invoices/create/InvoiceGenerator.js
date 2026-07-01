"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { getUninvoicedDataAction, generateSupplierInvoiceAction, editSupplierInvoiceAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import { calculateSupplierDeductions } from "@/lib/financial";
import { cn, getLocalDateString } from "@/lib/utils";
import { toast } from "sonner";
import { UNIT_IDS, DEFAULT_WEIGHT_UNIT } from "@/lib/units";
import { useSettings } from "@/components/layout/SettingsContext";
import { formatCurrency, formatNumber } from "@/lib/formatters/financialFormatter";

export default function InvoiceGenerator({ suppliers, initialInvoice = null, adjustmentDefinitions = [], backUrl = "" }) {
  const { decimalPlaces, currencySymbol } = useSettings();
  const router = useRouter();
  const [step, setStep] = useState(initialInvoice ? 2 : 1);

  const getIntakeDisplayRate = (intake) => {
    let displayRate = Number(intake.rate || 0);
    let displayRateUnit = intake.rateUnit || DEFAULT_WEIGHT_UNIT;

    if ((!displayRate || displayRate === 0) && intake.salesTracks && intake.salesTracks.length > 0) {
      const gross = intake.salesTracks.reduce((sum, track) => sum + Number(track.baseAmount || 0), 0);
      const weightVal = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
      if (weightVal > 0) {
        displayRate = gross / weightVal;
        displayRateUnit = intake.salesTracks[0].rateUnit || intake.rateUnit || DEFAULT_WEIGHT_UNIT;
      }
    }
    return { rate: displayRate, rateUnit: displayRateUnit };
  };
  const [selectedParty, setSelectedParty] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ intakes: [], advances: [] });
  const [selectedIntakes, setSelectedIntakes] = useState([]);
  const [selectedAdvances, setSelectedAdvances] = useState([]);
  const [entryDate, setEntryDate] = useState(
    initialInvoice?.entryDate 
      ? getLocalDateString(initialInvoice.entryDate) 
      : getLocalDateString()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Per-intake adjustments state: { [intakeId]: [adjustments] }
  const [adjustmentsByIntake, setAdjustmentsByIntake] = useState({});
  const [activeIntakeForAdjustment, setActiveIntakeForAdjustment] = useState(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [currentAdjustment, setCurrentAdjustment] = useState({
    code: null,
    adjustmentType: "Custom",
    method: "FIXED",
    direction: "SUBTRACT",
    value: "",
    unit: DEFAULT_WEIGHT_UNIT
  });

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (!isAdjustmentModalOpen) {
          if (step === 3) {
            setStep(2);
          } else if (step === 2) {
            setStep(1);
          } else if (step === 1) {
            router.push(backUrl || "/supplier-invoices");
          }
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [step, isAdjustmentModalOpen, backUrl, router]);

  // Group and load initial adjustments if editing
  useEffect(() => {
    if (initialInvoice) {
      setSelectedParty(initialInvoice.party);
      
      const initialSelected = [];
      const initialAdjustments = {};
      
      initialInvoice.items.forEach((item, idx) => {
        const matchingTrack = (item.intake?.salesTracks || []).find(t => 
          Number(t.quantity) === Number(item.weight) && Number(t.sellingRate) === Number(item.rate)
        );
        const virtualId = matchingTrack 
          ? `${item.intakeTransactionId}-track-${matchingTrack.id}`
          : `${item.intakeTransactionId}-fallback-${idx}`;
        
        initialSelected.push(virtualId);
        initialAdjustments[virtualId] = (item.adjustments || []).map(adj => ({
          adjustmentType: adj.adjustmentType,
          code: adj.code || "CUSTOM",
          isUserEditable: typeof adj.isUserEditable !== "undefined" && adj.isUserEditable !== null ? adj.isUserEditable : true,
          method: adj.method,
          value: Number(adj.value),
          direction: adj.direction,
          unit: adj.unit || null
        }));
      });
      
      setSelectedIntakes(initialSelected);
      setAdjustmentsByIntake(initialAdjustments);
      setSelectedAdvances(initialInvoice.advances.map(a => a.id));
      
      // Fetch other available uninvoiced intakes/advances
      fetchEditData(initialInvoice.party.id, initialInvoice);
    }
  }, [initialInvoice]);

  const fetchEditData = async (partyId, initial) => {
    setLoading(true);
    const result = await getUninvoicedDataAction(partyId);
    if (result.success) {
      // Intakes: merge current invoice items (with details) + any other uninvoiced intakes
      const linkedIntakes = initial.items.map((item, idx) => {
        const matchingTrack = (item.intake?.salesTracks || []).find(t => 
          Number(t.quantity) === Number(item.weight) && Number(t.sellingRate) === Number(item.rate)
        );
        const virtualId = matchingTrack 
          ? `${item.intakeTransactionId}-track-${matchingTrack.id}`
          : `${item.intakeTransactionId}-fallback-${idx}`;

        return {
          ...item.intake,
          virtualId,
          grossWeight: Number(item.weight),
          netWeight: Number(item.weight),
          rate: Number(item.rate),
          rateUnit: item.intake.rateUnit || "KG",
          buyerName: matchingTrack?.buyerName || null,
          salesTracks: [
            {
              id: matchingTrack?.id || 9999 + idx,
              quantity: Number(item.weight),
              netWeight: Number(item.weight),
              sellingRate: Number(item.rate),
              rateUnit: item.intake.rateUnit || "KG",
              buyerName: matchingTrack?.buyerName || null
            }
          ]
        };
      });

      // Find unique intakes combining both lists (group by base ID to avoid duplicate loading of the raw intake)
      const combinedIntakes = [...linkedIntakes];
      result.data.intakes.forEach(i => {
        if (!combinedIntakes.some(ci => ci.id === i.id)) {
          combinedIntakes.push(i);
        }
      });

      // Advances: merge current advances + other unlinked advances
      const combinedAdvances = [...initial.advances];
      result.data.advances.forEach(a => {
        if (!combinedAdvances.some(ca => ca.id === a.id)) {
          combinedAdvances.push(a);
        }
      });

      setData({
        intakes: combinedIntakes,
        advances: combinedAdvances
      });
    } else {
      toast.error("Failed to load additional data: " + result.error);
    }
    setLoading(false);
  };

  // Fetch data when party is selected (only when NOT in edit mode)
  useEffect(() => {
    if (selectedParty && !initialInvoice) {
      fetchData(selectedParty.id);
    }
  }, [selectedParty, initialInvoice]);

  const fetchData = async (partyId) => {
    setLoading(true);
    const result = await getUninvoicedDataAction(partyId);
    if (result.success) {
      setData(result.data);
      
      const initialSelected = [];
      const initialAdjustments = {};
      result.data.intakes.forEach(intake => {
        const tracksToSettle = (intake.salesTracks || []).filter(t => !t.isSettled);
        if (tracksToSettle.length > 0) {
          tracksToSettle.forEach(track => {
            const virtualId = `${intake.id}-track-${track.id}`;
            initialSelected.push(virtualId);
            initialAdjustments[virtualId] = (adjustmentDefinitions || [])
              .filter(d => d.isEnabledByDefault)
              .map(d => ({
                code: d.code,
                adjustmentType: d.name,
                method: d.method,
                value: d.defaultConfiguredValue !== null ? d.defaultConfiguredValue : "",
                direction: d.direction,
                unit: d.method === "PER_WEIGHT" ? "KG" : null,
                isUserEditable: d.isUserEditable
              }));
          });
        } else {
          const virtualId = String(intake.id);
          initialSelected.push(virtualId);
          initialAdjustments[virtualId] = (adjustmentDefinitions || [])
            .filter(d => d.isEnabledByDefault)
            .map(d => ({
              code: d.code,
              adjustmentType: d.name,
              method: d.method,
              value: d.defaultConfiguredValue !== null ? d.defaultConfiguredValue : "",
              direction: d.direction,
              unit: d.method === "PER_WEIGHT" ? "KG" : null,
              isUserEditable: d.isUserEditable
            }));
        }
      });
      
      setSelectedIntakes(initialSelected);
      setSelectedAdvances(result.data.advances.map(a => a.id));
      setAdjustmentsByIntake(initialAdjustments);
    } else {
      toast.error("Failed to load data: " + result.error);
    }
    setLoading(false);
  };

  const handleToggleIntake = (virtualId) => {
    setSelectedIntakes(prev => {
      const exists = prev.includes(virtualId);
      if (exists) {
        return prev.filter(i => i !== virtualId);
      } else {
        setAdjustmentsByIntake(adjPrev => {
          if (adjPrev[virtualId]) return adjPrev;
          const defaults = (adjustmentDefinitions || [])
            .filter(d => d.isEnabledByDefault)
            .map(d => ({
              code: d.code,
              adjustmentType: d.name,
              method: d.method,
              value: d.defaultConfiguredValue !== null ? d.defaultConfiguredValue : "",
              direction: d.direction,
              unit: d.method === "PER_WEIGHT" ? "KG" : null,
              isUserEditable: d.isUserEditable
            }));
          return {
            ...adjPrev,
            [virtualId]: defaults
          };
        });
        return [...prev, virtualId];
      }
    });
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

    const selectedDef = currentAdjustment.code ? adjustmentDefinitions.find(d => d.code === currentAdjustment.code) : null;
    setAdjustmentsByIntake(prev => {
      const currentList = prev[activeIntakeForAdjustment] || [];
      return {
        ...prev,
        [activeIntakeForAdjustment]: [
          ...currentList,
          {
            code: currentAdjustment.code || "CUSTOM",
            adjustmentType: currentAdjustment.adjustmentType,
            method: currentAdjustment.method,
            value: parseFloat(currentAdjustment.value),
            direction: currentAdjustment.direction,
            unit: currentAdjustment.method === "PER_WEIGHT" ? currentAdjustment.unit : null,
            isUserEditable: selectedDef ? selectedDef.isUserEditable : true
          }
        ]
      };
    });

    setIsAdjustmentModalOpen(false);
    setActiveIntakeForAdjustment(null);
    setCurrentAdjustment({
      code: null,
      adjustmentType: "Custom",
      method: "FIXED",
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
  const allSelectableIntakes = [];
  data.intakes.forEach(intake => {
    if (intake.virtualId) {
      allSelectableIntakes.push(intake);
    } else {
      const tracksToSettle = (intake.salesTracks || []).filter(t => !t.isSettled);
      const isPartial = !!((intake.salesTracks || []).length > 1 || intake.status === "PARTIAL" || (intake.remainingWeight && Number(intake.remainingWeight) > 0));
      
      if (tracksToSettle.length > 0) {
        tracksToSettle.forEach(track => {
          allSelectableIntakes.push({
            ...intake,
            virtualId: `${intake.id}-track-${track.id}`,
            grossWeight: Number(track.quantity),
            netWeight: Number(track.netWeight || track.quantity),
            rate: Number(track.sellingRate),
            rateUnit: track.rateUnit || "KG",
            buyerName: track.buyerName || track.buyer?.name || null,
            salesTracks: [track],
            isPartial
          });
        });
      } else {
        allSelectableIntakes.push({
          ...intake,
          virtualId: String(intake.id),
          rate: intake.rate ? Number(intake.rate) : 0,
          rateUnit: intake.rateUnit || "KG",
          isPartial
        });
      }
    }
  });

  const decomposedActiveIntakes = allSelectableIntakes.filter(i => selectedIntakes.includes(i.virtualId));
  const activeAdvances = data.advances.filter(a => selectedAdvances.includes(a.id));

  // Map local adjustmentsByIntake into active intakes object array
  const intakesWithAdjustments = decomposedActiveIntakes.map(intake => ({
    ...intake,
    adjustments: adjustmentsByIntake[intake.virtualId] || adjustmentsByIntake[intake.id] || []
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
    
    const sanitizedAdjustmentsByIntake = {};
    Object.keys(adjustmentsByIntake).forEach(key => {
      sanitizedAdjustmentsByIntake[key] = (adjustmentsByIntake[key] || []).map(adj => ({
        ...adj,
        value: adj.value === "" ? 0 : Number(adj.value)
      }));
    });
    formData.append("adjustmentsByIntake", JSON.stringify(sanitizedAdjustmentsByIntake));
    formData.append("entryDate", entryDate);

    if (initialInvoice) {
      formData.append("invoiceId", initialInvoice.id);
      const result = await editSupplierInvoiceAction(formData);
      if (result.success) {
        toast.success("Invoice updated successfully!");
        const dest = `/supplier-invoices/${result.data.id}`;
        router.push(backUrl ? `${dest}?backUrl=${encodeURIComponent(backUrl)}` : dest);
      } else {
        toast.error(result.error);
        setIsSubmitting(false);
      }
    } else {
      const result = await generateSupplierInvoiceAction(formData);
      if (result.success) {
        toast.success("Invoice generated successfully!");
        const dest = `/supplier-invoices/${result.data.id}`;
        router.push(backUrl ? `${dest}?backUrl=${encodeURIComponent(backUrl)}` : dest);
      } else {
        toast.error(result.error);
        setIsSubmitting(false);
      }
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
          {suppliers.map((s, index) => (
            <button
              key={s.id}
              autoFocus={index === 0}
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
              {allSelectableIntakes.map(i => {
                const isSelected = selectedIntakes.includes(i.virtualId);
                return (
                  <div 
                    key={i.virtualId}
                    onClick={() => handleToggleIntake(i.virtualId)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                      isSelected ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                      isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-xs font-bold text-primary">{i.intakeNumber}</div>
                        {i.isPartial && (
                          <span className="inline-flex items-center rounded-full px-1.5 py-0.2 text-[8px] font-black uppercase border bg-purple-100 text-purple-700 border-purple-200 tracking-wider">
                            PARTIAL
                          </span>
                        )}
                        {i.buyerName && (
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                            • {i.buyerName}
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-sm">{i.product.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-base font-mono">
                        {Number(i.netWeight || i.grossWeight).toLocaleString()} {i.unit || "KG"}
                      </div>
                      <div className="text-xs text-muted-foreground">{formatCurrency(i.rate, "en", currencySymbol, decimalPlaces)} / {i.rateUnit === UNIT_IDS.MAUND ? "Maund" : (i.rateUnit || "KG")}</div>
                    </div>
                  </div>
                );
              })}
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
                    <div className="font-bold text-lg text-emerald-600">{formatCurrency(a.amount, "en", currencySymbol, decimalPlaces)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-6">
            {initialInvoice ? (
              <Link href={backUrl ? `/supplier-invoices/${initialInvoice.id}?backUrl=${encodeURIComponent(backUrl)}` : `/supplier-invoices/${initialInvoice.id}`} className="px-6 py-2 rounded-lg border hover:bg-muted transition-colors font-medium">Cancel</Link>
            ) : (
              <button onClick={() => setStep(1)} className="px-6 py-2 rounded-lg border hover:bg-muted transition-colors font-medium">Back</button>
            )}
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
                {intakesWithAdjustments.map(intake => {
                  const breakdown = intakeBreakdowns.find(b => b.intakeId === (intake.virtualId || intake.id)) || {
                    gross: 0,
                    deductions: 0,
                    net: 0,
                    adjustments: []
                  };
                  const weight = intake.netWeight !== null && intake.netWeight !== undefined ? Number(intake.netWeight) : Number(intake.grossWeight);
                  return (
                    <div key={intake.virtualId || intake.id} className="p-4 border rounded-xl space-y-4 bg-muted/10 relative group/card">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {intake.intakeNumber}
                            </span>
                            {intake.buyerName && (
                              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                • {intake.buyerName}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-sm mt-1">{intake.product.name}</h4>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                          {intake.bagCount ? `${intake.bagCount} Bags • ` : ""}{weight} {intake.unit || "KG"} @ {formatCurrency(getIntakeDisplayRate(intake).rate, "en", currencySymbol, decimalPlaces)}/{getIntakeDisplayRate(intake).rateUnit === UNIT_IDS.MAUND ? "Maund" : (getIntakeDisplayRate(intake).rateUnit || "KG")}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block font-medium">Gross Amount</span>
                        <span className="font-bold text-sm">{formatCurrency(breakdown.gross, "en", currencySymbol, decimalPlaces)}</span>
                      </div>
                      </div>

                      {/* Per-Intake Adjustments Manager */}
                      <div className="border-t border-dashed pt-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Adjustments / Deductions</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveIntakeForAdjustment(intake.virtualId || intake.id);
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
                            {breakdown.adjustments.map((adj, idx) => {
                              const definition = adjustmentDefinitions.find(d => d.code === adj.code);
                              const isEditable = typeof adj.isUserEditable !== "undefined" && adj.isUserEditable !== null
                                ? adj.isUserEditable
                                : (definition ? definition.isUserEditable : true);
                              return (
                                <div key={idx} className="flex justify-between items-center text-xs bg-card border rounded-lg px-3 py-1.5 group/item gap-4">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-semibold text-muted-foreground block truncate">
                                      {adj.adjustmentType}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground/60 uppercase flex items-center gap-1 mt-0.5">
                                      <span>{adj.method}</span>
                                      <span>•</span>
                                      <span className={adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"}>
                                        {adj.direction}
                                      </span>
                                      {adj.unit && (
                                        <>
                                          <span>•</span>
                                          <span>per {adj.unit}</span>
                                        </>
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="w-20">
                                      {isEditable ? (
                                        <input
                                          type="number"
                                          step="any"
                                          value={adj.value}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setAdjustmentsByIntake(prev => {
                                              const list = [...(prev[intake.virtualId || intake.id] || [])];
                                              list[idx] = { ...list[idx], value: val === "" ? "" : Number(val) };
                                              return { ...prev, [intake.virtualId || intake.id]: list };
                                            });
                                          }}
                                          className="w-full px-2 py-0.5 text-xs border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-right"
                                        />
                                      ) : (
                                        <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded block text-right">
                                          {adj.value}
                                        </span>
                                      )}
                                    </div>
                                    <span className={cn(
                                      "font-mono font-bold min-w-[70px] text-right",
                                      adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                      {adj.direction === "ADD" ? "+" : "-"} {formatCurrency(adj.calculatedAmount, "en", currencySymbol, decimalPlaces)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeAdjustment(intake.virtualId || intake.id, idx)}
                                      className="text-muted-foreground hover:text-rose-600 transition-colors p-0.5"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[10px] text-muted-foreground italic text-center py-2 border border-dashed rounded-lg opacity-60 bg-muted/5">
                            No adjustments applied to this intake.
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-3 flex justify-between items-center bg-primary/5 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                        <span className="text-xs font-bold text-primary">Portion Net Value</span>
                        <span className="font-black text-sm text-primary">{formatCurrency(breakdown.net, "en", currencySymbol, decimalPlaces)}</span>
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
                      <div className="font-mono font-bold text-sm text-rose-600">- {formatCurrency(adv.amount, "en", currencySymbol, decimalPlaces)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Columns: Billing Summary */}
          <div className="space-y-6">
            {/* Settlement Date Picker */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <label htmlFor="settlementEntryDate" className="block text-xs font-black uppercase tracking-wider text-muted-foreground">
                Settlement Date
              </label>
              <input
                id="settlementEntryDate"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary transition-all font-mono"
              />
            </div>

            {/* Financial Summary Card */}
            <div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-xl shadow-primary/10 space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b border-white/20 pb-4">
                <ReceiptText className="h-5 w-5" />
                Settlement Summary
              </h3>
              
              <div className="space-y-3 font-medium text-sm">
                <div className="flex justify-between items-center">
                  <span className="opacity-80">Total Intakes</span>
                  <span>{decomposedActiveIntakes.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-80">Base Amount</span>
                  <span>{formatCurrency(totalGrossValue, "en", currencySymbol, decimalPlaces)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-80">Total Adjustments</span>
                  <span className="text-rose-200">-{formatCurrency(totalDeductions, "en", currencySymbol, decimalPlaces)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-2 font-bold text-base">
                  <span>Net Amount</span>
                  <span>{formatCurrency(netValue, "en", currencySymbol, decimalPlaces)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="opacity-80">Less: Total Advances</span>
                  <span className="text-rose-200">-{formatCurrency(totalAdvances, "en", currencySymbol, decimalPlaces)}</span>
                </div>
                <div className="flex justify-between items-end border-t border-white/20 pt-4">
                  <span className="font-bold text-xs uppercase opacity-75">Final Total</span>
                  <div className="text-right">
                    <span className="text-2xl font-black">{formatCurrency(finalPayable, "en", currencySymbol, decimalPlaces)}</span>
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
                  {(() => {
                    const selectedDef = currentAdjustment.code ? adjustmentDefinitions.find(d => d.code === currentAdjustment.code) : null;
                    const isCurrentEditable = selectedDef ? selectedDef.isUserEditable : true;
                    return (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Adjustment Template / Type</label>
                          <select 
                            value={currentAdjustment.code || "CUSTOM"}
                            onChange={e => {
                              const selectedCode = e.target.value;
                              if (selectedCode === "CUSTOM") {
                                setCurrentAdjustment({
                                  code: null,
                                  adjustmentType: "Custom",
                                  method: "FIXED",
                                  direction: "SUBTRACT",
                                  value: "",
                                  unit: "KG"
                                });
                              } else {
                                const def = adjustmentDefinitions.find(d => d.code === selectedCode);
                                if (def) {
                                  setCurrentAdjustment({
                                    code: def.code,
                                    adjustmentType: def.name,
                                    method: def.method,
                                    direction: def.direction,
                                    value: def.defaultConfiguredValue !== null ? String(def.defaultConfiguredValue) : "",
                                    unit: "KG"
                                  });
                                }
                              }
                            }}
                            className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-card-foreground text-sm"
                          >
                            <option value="CUSTOM">Custom (Manual Adjustment)</option>
                            {adjustmentDefinitions.map(def => (
                              <option key={def.code} value={def.code}>{def.name} ({def.code})</option>
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
                              disabled={!isCurrentEditable}
                              className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-card-foreground disabled:opacity-60"
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
                              disabled={!isCurrentEditable}
                              className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-card-foreground disabled:opacity-60"
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
                              disabled={!isCurrentEditable}
                              className="w-full bg-background border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-primary/20 text-card-foreground disabled:opacity-60"
                            >
                              <option value={UNIT_IDS.KG}>KG</option>
                              <option value={UNIT_IDS.MAUND}>Maund</option>
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
                            disabled={!isCurrentEditable}
                            className="w-full bg-background border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 font-mono text-lg text-card-foreground disabled:opacity-60"
                            autoFocus
                          />
                        </div>
                      </>
                    );
                  })()}

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
