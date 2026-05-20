import React from "react";
import { SaleService } from "@/modules/sales/services/SaleService";
import Link from "next/link";
import { 
  ChevronLeft, 
  ReceiptText, 
  User, 
  Calendar, 
  Package, 
  Scale, 
  Banknote,
  Printer,
  Download,
  Edit2,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import StatusUpdateButtons from "./StatusUpdateButtons";
import RevertStatusButton from "./RevertStatusButton";
import DeleteButton from "@/components/DeleteButton";
import { deleteSaleAction, updateSaleStatusAction } from "@/modules/sales/controllers/saleActions";

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/sales"
            className="rounded-full p-2 hover:bg-accent transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Sale {sale.saleNumber}</h1>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                sale.status === "PENDING" ? "bg-amber-100 text-amber-700 border-amber-200" :
                sale.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
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
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/sales/${sale.id}/edit`}
            className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </Link>
          <button className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent transition-colors">
            <Printer className="h-4 w-4" />
            Print
          </button>
          <DeleteButton 
            id={sale.id} 
            deleteAction={deleteSaleAction} 
            redirectPath="/sales" 
            label="Sale Invoice" 
            buttonText="Delete"
          />
          <StatusUpdateButtons 
            id={sale.id} 
            currentStatus={sale.status} 
            updateAction={updateSaleStatusAction} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Transaction Data */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Card */}
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-muted/30 border-b flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Invoice Details</h3>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-0">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/10 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b">
                    <th className="px-6 py-3">Product</th>
                    <th className="px-6 py-3 text-right">Gross Weight</th>
                    <th className="px-6 py-3 text-right">Rate</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                       <td className="px-6 py-4 font-semibold">{item.product.name}</td>
                       <td className="px-6 py-4 text-right font-mono text-xs">
                         {item.weight.toLocaleString()} <span className="text-[10px] opacity-60 uppercase">{item.unit === "MAUND" ? "MND" : item.unit}</span>
                       </td>
                       <td className="px-6 py-4 text-right font-mono text-xs">
                         Rs. {item.rate.toLocaleString()} / <span className="text-[10px] opacity-60 uppercase">{item.rateUnit === "MAUND" ? "MND" : item.rateUnit}</span>
                       </td>
                       <td className="px-6 py-4 text-right font-bold">Rs. {item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-6 bg-muted/5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t">
               <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Base Amount</span>
                  <div className="text-xl font-bold">Rs. {sale.baseAmount.toLocaleString()}</div>
               </div>
               <div className="space-y-1 md:text-right">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Net Weight</span>
                  <div className="text-xl font-bold">{sale.totalWeight.toLocaleString()} <span className="text-sm font-normal">KG</span></div>
               </div>
            </div>
          </div>

          {/* Adjustments Card */}
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

        {/* Right Column: Party Info & Total */}
        <div className="space-y-8">
           {/* Final Total Card */}
           <div className="rounded-2xl bg-primary p-8 text-primary-foreground shadow-lg shadow-primary/20 relative overflow-hidden">
              <ReceiptText className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10 rotate-12" />
              <div className="relative z-10">
                <span className="text-[10px] uppercase font-bold opacity-60 tracking-widest">Final Invoice Total</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-sm opacity-80">Rs.</span>
                  <h2 className="text-4xl font-black tracking-tighter">{sale.finalAmount.toLocaleString()}</h2>
                </div>
                <div className="mt-6 pt-6 border-t border-white/20">
                   <div className="flex justify-between items-center text-xs opacity-80">
                      <span>Base Amount</span>
                      <span>Rs. {sale.baseAmount.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs opacity-80 mt-2">
                      <span>Adjustments</span>
                      <span>{sale.totalAdjustments >= 0 ? "+" : ""} Rs. {sale.totalAdjustments.toLocaleString()}</span>
                   </div>
                </div>
              </div>
           </div>

           {/* Buyer Info */}
           <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b pb-3">Buyer Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                   <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                   </div>
                   <div>
                      <div className="font-bold">{sale.party.name}</div>
                      <div className="text-xs text-muted-foreground">{sale.party.phoneNumber}</div>
                      <div className="text-[10px] font-bold text-primary uppercase mt-1">Buyer</div>
                   </div>
                </div>
                
                <div className="space-y-3 pt-4 border-t text-sm">
                   <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{format(new Date(sale.entryDate), "PPPP")}</span>
                   </div>
                </div>
              </div>
           </div>

           {/* Notes */}
           {sale.notes && (
             <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Notes</h3>
                <p className="text-sm italic text-muted-foreground leading-relaxed">
                   "{sale.notes}"
                </p>
             </div>
           )}

           {/* Activity Log */}
           {sale.changeLog && sale.changeLog.length > 0 && (
             <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground border-b pb-3 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Activity History
                </h3>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
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
