import React from "react";
import Link from "next/link";
import { AlertCircle, Calendar, ReceiptText, User } from "lucide-react";
import { getSupplierInvoiceAction, deleteSupplierInvoiceAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import StatusUpdater from "./StatusUpdater";
import RegenerateButton from "./RegenerateButton";
import SupplierPaymentCard from "./SupplierPaymentCard";
import { calculateSupplierDeductions } from "@/lib/financial";
import ResponsiveHeader from "@/components/ResponsiveHeader";
import Alert from "@/components/ui/Alert";
import { formatMaundWeight } from "@/lib/display-units";

export default async function SupplierInvoiceDetailPage({ params }) {
  const { id } = await params;
  const result = await getSupplierInvoiceAction(id);
  
  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground">{result.error}</p>
        <Link href="/supplier-invoices" className="mt-6 text-primary hover:underline">Back to list</Link>
      </div>
    );
  }

  const invoice = result.data;

  // Recalculate per-intake breakdown using snapshot values and nested adjustments from SupplierInvoiceItems
  const { intakeBreakdowns } = calculateSupplierDeductions(
    invoice.items.map(item => ({
      ...item.intake,
      id: item.intakeTransactionId,
      netWeight: Number(item.weight),
      rate: Number(item.rate),
      adjustments: (item.adjustments || []).map(adj => ({
        adjustmentType: adj.adjustmentType,
        method: adj.method,
        value: Number(adj.value),
        direction: adj.direction
      }))
    }))
  );

  // Group and sum identical adjustments across items to display in the overall summary card
  const summaryAdjustments = [];
  invoice.items.forEach(item => {
    (item.adjustments || []).forEach(adj => {
      const existing = summaryAdjustments.find(
        a => a.adjustmentType === adj.adjustmentType &&
             a.method === adj.method &&
             Number(a.value) === Number(adj.value) &&
             a.direction === adj.direction
      );
      if (existing) {
        existing.calculatedAmount += Number(adj.calculatedAmount);
      } else {
        summaryAdjustments.push({
          adjustmentType: adj.adjustmentType,
          method: adj.method,
          value: Number(adj.value),
          direction: adj.direction,
          calculatedAmount: Number(adj.calculatedAmount),
          unit: adj.unit || null
        });
      }
    });
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <ResponsiveHeader
        backUrl="/supplier-invoices"
        title={
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Settlement Invoice</h1>
              <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-[10px] font-bold">V{invoice.version}</span>
              <span className={cn(
                "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase",
                invoice.status === "CLEARED" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                invoice.status === "SUPERSEDED" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                invoice.status === "PARTIAL" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                "bg-amber-50 text-amber-700 border border-amber-200"
              )}>
                {invoice.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{invoice.invoiceNumber}</p>
          </div>
        }
        editUrl={invoice.status === "PENDING" ? `/supplier-invoices/${invoice.id}/edit` : null}
        printType="settlement"
        printData={{
          invoice,
          intakeBreakdowns,
          summaryAdjustments
        }}
        printFilename={`Settlement-${invoice.invoiceNumber || invoice.id}`}
        deleteId={invoice.id}
        deleteAction={deleteSupplierInvoiceAction}
        deleteLabel="Supplier Invoice"
        deleteRedirect="/supplier-invoices"
        extraActions={
          <div className="flex items-center gap-2">
            {invoice.isOutdated && invoice.status !== "SUPERSEDED" && (
              <RegenerateButton invoiceId={invoice.id} />
            )}
            <StatusUpdater id={invoice.id} currentStatus={invoice.status} disabled={invoice.status === "SUPERSEDED"} />
          </div>
        }
      />

      {invoice.isOutdated && invoice.status !== "SUPERSEDED" && (
        <Alert
          type="warning"
          title="This invoice is outdated"
          message="Underlying intakes or advances have been modified. Consider regenerating a new version for accurate settlement."
        />
      )}

      {invoice.status === "SUPERSEDED" && (
        <Alert
          type="info"
          icon="history"
          title="Superseded Version"
          message="This is an older version of the settlement. A newer version exists."
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Invoiced Items details (Larger Space) */}
        <div className="lg:col-span-2 rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col justify-between h-full min-h-[440px]">
          <div>
            <div className="px-4 py-3 bg-muted/30 border-b flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Invoiced Items</h3>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase font-black">V{invoice.version}</span>
            </div>
            <div className="overflow-y-auto max-h-[300px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/10">
                  <tr className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest border-b">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-4 py-2 text-right">Weight</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-right">Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map(item => (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-2">
                        <div className="font-semibold text-foreground">{item.intake.product.name}</div>
                        <div className="text-[9px] font-mono text-muted-foreground">{item.intake.intakeNumber}</div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[10px]">
                        {item.intake.unit === "MAUND" ? formatMaundWeight(item.weight, "MND", "KG") : `${Number(item.weight)} ${item.intake.unit || "KG"}`}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-[10px]">Rs. {Number(item.rate)}</td>
                      <td className="px-4 py-2 text-right font-bold text-foreground">Rs. {Number(item.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="px-4 py-3 bg-muted/5 border-t flex justify-between items-center text-xs">
            <div>
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest block">Invoice #</span>
              <span className="font-mono font-bold text-[10px] text-primary">{invoice.invoiceNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest block">Gross Total</span>
              <span className="font-bold">Rs. {Number(invoice.totalGrossValue).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Unified Sidebar (Amount Calculation & Clearance Card) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Amount Calculation & Supplier Card */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col justify-between h-auto">
            <div className="bg-primary p-6 text-primary-foreground relative overflow-hidden flex-1 flex flex-col justify-between min-h-[160px]">
              <ReceiptText className="absolute -right-4 -bottom-4 h-24 w-24 opacity-10 rotate-12" />
              <div className="relative z-10">
                <span className="text-[9px] uppercase font-bold opacity-60 tracking-widest block">Final Payable Total</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xs opacity-80">Rs.</span>
                  <h2 className="text-3xl font-black tracking-tighter">{Number(invoice.finalPayableAmount).toLocaleString()}</h2>
                </div>
              </div>
              <div className="relative z-10 pt-4 border-t border-white/20 mt-4 text-[11px] space-y-1">
                <div className="flex justify-between items-center opacity-85">
                  <span>Gross Value</span>
                  <span className="font-semibold">Rs. {Number(invoice.totalGrossValue).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center opacity-85">
                  <span>Deductions</span>
                  <span className="font-semibold text-rose-300">- Rs. {Number(invoice.totalDeductions).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center opacity-85">
                  <span>Advances Adjusted</span>
                  <span className="font-semibold text-rose-300">- Rs. {Number(invoice.totalAdvances).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-card flex items-center gap-3 border-t">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs truncate">{invoice.party.name}</div>
                <div className="text-[10px] text-muted-foreground leading-none">{format(new Date(invoice.createdAt), "dd MMM yyyy")}</div>
              </div>
            </div>
          </div>

          {/* Clearance Card */}
          <div>
            <SupplierPaymentCard invoice={invoice} />
          </div>
        </div>
      </div>

      {/* Symmetrical Lower Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Side: Adjustments Summary Table */}
        <div className="lg:col-span-2 space-y-6">
          {/* Billing Adjustments Card */}
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/30 font-bold uppercase text-[10px] tracking-wider text-muted-foreground flex justify-between items-center">
              <span>Billing Adjustments Summary</span>
              <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase">Calculated Per Intake</span>
            </div>
            <div className="p-0">
              {summaryAdjustments.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted-foreground text-sm italic">
                  No adjustments applied to this invoice.
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/5 text-[9px] uppercase font-bold text-muted-foreground tracking-widest border-b">
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Rule</th>
                      <th className="px-4 py-2 text-right">Total Calculated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summaryAdjustments.map((adj, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">
                          <div className="font-semibold">{adj.adjustmentType}</div>
                          <div className={cn(
                            "text-[9px] font-bold uppercase",
                            adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {adj.direction}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                          {adj.method === "PERCENTAGE" ? `${Number(adj.value)}%` : 
                           adj.method === "PER_WEIGHT" ? `Rs. ${Number(adj.value)} per ${adj.unit || "KG"}` : 
                           `Fixed Rs. ${Number(adj.value)}`}
                        </td>
                        <td className={cn(
                          "px-4 py-3 text-right font-bold",
                          adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {adj.direction === "ADD" ? "+" : "-"} Rs. {Number(adj.calculatedAmount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Advances & Meta */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/30 font-bold uppercase text-[10px] tracking-wider text-muted-foreground">Advances Adjusted</div>
            <div className="p-4">
              {invoice.advances.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">No advances adjusted in this invoice.</div>
              ) : (
                <div className="space-y-3">
                  {invoice.advances.map(adv => (
                    <div key={adv.id} className="flex justify-between items-center text-sm p-3 rounded-lg bg-muted/20">
                      <div>
                        <div className="font-medium text-xs">Advance Payment</div>
                        <div className="text-[10px] text-muted-foreground">{adv.notes}</div>
                      </div>
                      <div className="font-bold text-rose-600 text-xs">- Rs. {Number(adv.amount).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4 text-[10px] space-y-2 text-muted-foreground">
             <div className="flex justify-between">
                <span>Created At</span>
                <span className="font-medium">{format(new Date(invoice.createdAt), "dd MMM yyyy HH:mm")}</span>
             </div>
             <div className="flex justify-between">
                <span>Snapshot Version</span>
                <span className="font-mono font-bold">V{invoice.version}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
