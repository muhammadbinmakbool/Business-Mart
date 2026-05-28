import React from "react";
import { SaleService } from "@/modules/sales/services/SaleService";
import Link from "next/link";
import { 
  ReceiptText, 
  User, 
  Calendar, 
  Package, 
  Scale, 
  Banknote,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import StatusUpdateButtons from "./StatusUpdateButtons";
import RevertStatusButton from "./RevertStatusButton";
import SalePaymentCard from "./SalePaymentCard";
import { deleteSaleAction, updateSaleStatusAction } from "@/modules/sales/controllers/saleActions";
import ResponsiveHeader from "@/components/ResponsiveHeader";
import { formatMaundWeight } from "@/lib/display-units";

export default async function SaleDetailsPage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const sale = await SaleService.getSale(params.id);

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <ReceiptText className="h-12 w-12 text-muted-foreground opacity-20" />
        <h1 className="text-xl font-bold text-muted-foreground">Sale Invoice not found</h1>
        <Link href="/sales" className="text-primary hover:underline">Back to Sales</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <ResponsiveHeader
        backUrl="/sales"
        title={
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Sale {sale.saleNumber}</h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                sale.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                sale.status === "PARTIAL" ? "bg-blue-100 text-blue-700 border-blue-200" :
                sale.status === "CLEARED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                "bg-rose-100 text-rose-700 border-rose-200"
              )}>
                {sale.status}
              </span>
              {sale.status !== "PENDING" && (
                <RevertStatusButton id={sale.id} />
              )}
            </div>
            <p className="text-sm text-muted-foreground">Buyer invoice and transaction breakdown.</p>
          </div>
        }
        editUrl={sale.status === "PENDING" ? `/sales/${sale.id}/edit` : null}
        printType="sale"
        printData={sale}
        printFilename={`Sale-${sale.saleNumber || sale.id}`}
        deleteId={sale.id}
        deleteAction={deleteSaleAction}
        deleteLabel="Sale Invoice"
        deleteRedirect="/sales"
        extraActions={
          <StatusUpdateButtons 
            id={sale.id} 
            currentStatus={sale.status} 
            updateAction={updateSaleStatusAction} 
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Invoiced Items & Billing Adjustments stacked naturally (lg:col-span-2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Invoiced Items Card (dynamic height h-fit) */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden h-fit">
            <div className="px-5 py-4 bg-muted/30 border-b flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Invoiced Items</h3>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/10 text-[9px] uppercase font-bold text-muted-foreground tracking-widest border-b">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Weight</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sale.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/5 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{item.product.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-[10px]">
                        {item.unit === "MAUND" ? formatMaundWeight(item.weight, "MND", "KG") : `${item.weight.toLocaleString()} ${item.unit}`}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[10px]">
                        Rs. {item.rate.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">Rs. {item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 bg-muted/5 border-t flex justify-between items-center text-xs">
              <div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest block">Net Weight</span>
                <span className="font-bold text-sm">{sale.totalWeight.toLocaleString()} KG</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest block">Base Amount</span>
                <span className="font-bold text-sm text-foreground">Rs. {sale.baseAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 2. Detailed Adjustments Card */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-muted/30 border-b flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Billing Adjustments</h3>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-0">
              {sale.adjustments.length === 0 ? (
                <div className="px-6 py-8 text-center text-muted-foreground text-sm italic">
                  No adjustments applied to this invoice.
                </div>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/10 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b">
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Rule</th>
                      <th className="px-6 py-3 text-right">Calculated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sale.adjustments.map((adj) => (
                      <tr key={adj.id}>
                        <td className="px-6 py-4">
                          <div className="font-semibold">{adj.adjustmentType}</div>
                          <div className={cn(
                            "text-[10px] font-bold uppercase",
                            adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"
                          )}>
                            {adj.direction}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                          {adj.method === "PERCENTAGE" ? `${adj.value}% of Base` : 
                           adj.method === "PER_WEIGHT" ? `Rs. ${adj.value} per ${adj.unit || "KG"}` : 
                           `Fixed Rs. ${adj.value}`}
                        </td>
                        <td className={cn(
                          "px-6 py-4 text-right font-bold",
                          adj.direction === "ADD" ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {adj.direction === "ADD" ? "+" : "-"} Rs. {adj.calculatedAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/5 font-bold">
                      <td colSpan={2} className="px-6 py-4 text-right text-[10px] uppercase tracking-widest text-muted-foreground">Total Adjustments</td>
                      <td className={cn(
                        "px-6 py-4 text-right",
                        sale.totalAdjustments >= 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {sale.totalAdjustments >= 0 ? "+" : ""} Rs. {sale.totalAdjustments.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Unified Sidebar Card & Notes/History stacked naturally (lg:col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          {/* 1. Unified Sidebar Card */}
          <SalePaymentCard sale={sale} />

          {/* 2. Notes Card (if present) */}
          {sale.notes && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Notes</h3>
              <p className="text-sm italic text-muted-foreground leading-relaxed">
                &quot;{sale.notes}&quot;
              </p>
            </div>
          )}

          {/* 3. Activity History Card (if present) */}
          {sale.changeLog && sale.changeLog.length > 0 && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b pb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Activity History
              </h3>
              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
                {sale.changeLog.slice().reverse().map((log, i) => (
                  <div key={i} className="relative pl-4 border-l-2 border-muted pb-1">
                    <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-muted" />
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">
                      {format(new Date(log.timestamp), "MMM dd, HH:mm")}
                    </div>
                    <div className="text-xs font-bold">{log.action}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{log.summary}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
