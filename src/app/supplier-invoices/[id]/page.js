import React from "react";
import Link from "next/link";
import { History, AlertCircle } from "lucide-react";
import { getSupplierInvoiceAction, deleteSupplierInvoiceAction } from "@/modules/supplier-invoices/controllers/supplierInvoiceActions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import StatusUpdater from "./StatusUpdater";
import RegenerateButton from "./RegenerateButton";
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
          invoice.isOutdated && invoice.status !== "SUPERSEDED" && (
            <RegenerateButton invoiceId={invoice.id} />
          )
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
          icon={History}
          title="Superseded Version"
          message="This is an older version of the settlement. A newer version exists."
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-muted/30 font-bold uppercase text-[10px] tracking-wider text-muted-foreground">Invoiced Items</div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/10">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Product</th>
                    <th className="px-4 py-2 font-semibold text-right">Gross Weight</th>
                    <th className="px-4 py-2 font-semibold text-right">Rate</th>
                    <th className="px-4 py-2 font-semibold text-right">Gross</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map(item => {
                    const breakdown = intakeBreakdowns.find(b => b.intakeId === item.intakeTransactionId) || {
                      deductions: 0,
                      net: Number(item.amount),
                      adjustments: []
                    };
                    return (
                      <React.Fragment key={item.id}>
                        <tr className="border-t">
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.intake.product.name}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{item.intake.intakeNumber}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.intake.unit === "MAUND" ? formatMaundWeight(item.weight, "MND", "KG") : `${Number(item.weight)} ${item.intake.unit || "KG"}`}
                          </td>
                          <td className="px-4 py-3 text-right">Rs. {Number(item.rate)} / {item.intake.rateUnit === "MAUND" ? "Maund" : (item.intake.rateUnit || "KG")}</td>
                          <td className="px-4 py-3 text-right font-bold">Rs. {Number(item.amount).toLocaleString()}</td>
                        </tr>
                        {breakdown.adjustments && breakdown.adjustments.length > 0 && (
                          <tr className="bg-muted/5">
                            <td colSpan={4} className="px-4 py-2 text-xs">
                              <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground pl-4 border-l-2 border-primary/20">
                                <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground/80 font-semibold">Item Deductions:</span>
                                {breakdown.adjustments.map((adj, idx) => (
                                  <span key={idx}>
                                    {adj.adjustmentType} ({adj.method === "PERCENTAGE" ? `${adj.value}%` : adj.method === "PER_WEIGHT" ? `Rs. ${adj.value}/${adj.unit || "KG"}` : `Fixed`}):{" "}
                                    <span className={cn(
                                      "font-bold font-mono",
                                      adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                      {adj.direction === "ADD" ? "+" : "-"}Rs. {adj.calculatedAmount.toLocaleString()}
                                    </span>
                                  </span>
                                ))}
                                <span className="font-bold text-primary">
                                  Net: Rs. {breakdown.net.toLocaleString()}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

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
                        <div className="font-medium">Advance Payment</div>
                        <div className="text-xs text-muted-foreground">{adv.notes}</div>
                      </div>
                      <div className="font-bold text-rose-600">- Rs. {Number(adv.amount).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Supplier</h3>
              <div className="text-xl font-black">{invoice.party.name}</div>
              <div className="text-sm text-muted-foreground">{invoice.party.phoneNumber}</div>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Amount</span>
                <span className="font-bold">Rs. {Number(invoice.totalGrossValue).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Adjustments</span>
                <span className="font-bold text-rose-600">- Rs. {Number(invoice.totalDeductions).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Advances</span>
                <span className="font-bold text-rose-600">- Rs. {Number(invoice.totalAdvances).toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t flex justify-between items-center">
                <span className="font-black text-primary uppercase">Final Total</span>
                <span className="text-2xl font-black text-primary">Rs. {Number(invoice.finalPayableAmount).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <StatusUpdater id={invoice.id} currentStatus={invoice.status} disabled={invoice.status === "SUPERSEDED"} />
            </div>
          </div>
          
          <div className="rounded-xl border bg-muted/20 p-4 text-xs space-y-2 text-muted-foreground">
             <div className="flex justify-between">
                <span>Created At</span>
                <span>{format(new Date(invoice.createdAt), "dd MMM yyyy HH:mm")}</span>
             </div>
             <div className="flex justify-between">
                <span>Snapshot Version</span>
                <span className="font-mono">V{invoice.version}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
