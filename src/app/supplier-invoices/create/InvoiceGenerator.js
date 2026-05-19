"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Package, Wallet, Calculator, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
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

  // Deductions config (hardcoded defaults for Step 4.5)
  const [config, setConfig] = useState({
    kaat: { method: "WEIGHT_PER_BAG", value: 1 }, // 1kg per bag
    brokerage: { method: "PERCENTAGE", value: 1.5 } // 1.5% commission
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

  // Calculations
  const activeIntakes = data.intakes.filter(i => selectedIntakes.includes(i.id));
  const activeAdvances = data.advances.filter(a => selectedAdvances.includes(a.id));

  const { totalGrossValue, totalDeductions, netValue } = calculateSupplierDeductions(activeIntakes, config);
  const totalAdvances = activeAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
  const finalPayable = netValue - totalAdvances;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("partyId", selectedParty.id);
    formData.append("intakeIds", JSON.stringify(selectedIntakes));
    formData.append("advanceIds", JSON.stringify(selectedAdvances));
    formData.append("config", JSON.stringify(config));

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
                    <div className="font-bold text-lg">{Number(i.grossWeight)} KG</div>
                    <div className="text-xs text-muted-foreground">Rs. {Number(i.rate)} / Unit</div>
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
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card shadow-xl overflow-hidden">
            <div className="bg-primary p-6 text-primary-foreground">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">Settlement Preview</h3>
                  <div className="text-2xl font-black">{selectedParty.name}</div>
                </div>
                <Calculator className="h-10 w-10 opacity-20" />
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-muted-foreground">Total Gross Value</div>
                <div className="text-right font-bold">Rs. {totalGrossValue.toLocaleString()}</div>
                
                <div className="text-muted-foreground">Total Deductions (Kaat & Brokerage)</div>
                <div className="text-right font-bold text-rose-600">- Rs. {totalDeductions.toLocaleString()}</div>
                
                <div className="pt-4 border-t text-muted-foreground">Net Product Value</div>
                <div className="pt-4 border-t text-right font-bold">Rs. {netValue.toLocaleString()}</div>
                
                <div className="text-muted-foreground">Advances to Deduct</div>
                <div className="text-right font-bold text-rose-600">- Rs. {totalAdvances.toLocaleString()}</div>
                
                <div className="pt-6 border-t text-lg font-black uppercase text-primary">Final Payable</div>
                <div className="pt-6 border-t text-2xl font-black text-primary text-right">Rs. {finalPayable.toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <button onClick={() => setStep(2)} className="px-6 py-2 rounded-lg border hover:bg-muted transition-colors font-medium">Back</button>
            <button 
              disabled={isSubmitting}
              onClick={handleSubmit} 
              className="px-8 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Generate Invoice"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
